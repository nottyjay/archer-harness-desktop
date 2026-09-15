use serde::Serialize;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager, Runtime};

use super::constants::*;
use super::format::get_dsh_service_url;
use super::{detect_region, Region};

/// 获取当前构建专用的 AppData 基础目录。
///
/// debug 与 release 不能共用核心安装目录：更新或切换 debug 核心时，可能替换
/// release 正在加载的 Node 原生模块。用户数据目录另由 `get_dsh_data_path` 隔离。
pub fn get_base_dir<R: Runtime>(app_handle: &AppHandle<R>) -> PathBuf {
    let base = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to resolve app data directory");
    if cfg!(debug_assertions) {
        base.join(APP_DATA_DEV_DIR_NAME)
    } else {
        base
    }
}

/// 打包的 DeepSeek Harness 发行版下载前缀：恒为 GitHub Release 官方直连，
/// 作为首选下载源（镜像 ghfast.top 中转不稳定，仅作官方失败后的兜底）。
fn dsh_core_base_url() -> &'static str {
    DSH_CORE_URL
}

/// Harness 发行版资产文件名（按平台与架构）
fn dsh_pkg_asset_filename() -> Result<String, String> {
    let arch = env::consts::ARCH;
    let os = env::consts::OS;

    match (os, arch) {
        ("windows", _) => Ok("deepseek-harness-pkg-windows.zip".to_string()),
        ("macos", "aarch64") => Ok("deepseek-harness-pkg-macos-arm64.zip".to_string()),
        ("macos", "x86_64") => Ok("deepseek-harness-pkg-macos-x64.zip".to_string()),
        ("linux", _) => Ok("deepseek-harness-pkg-linux.zip".to_string()),
        _ => Err(format!("Unsupported platform: {} {}", os, arch)),
    }
}

/// 打包的 DeepSeek Harness 发行版下载地址（GitHub 官方直连，首选源）
pub fn get_dsh_download_url() -> Result<String, String> {
    Ok(format!(
        "{}{}",
        dsh_core_base_url(),
        dsh_pkg_asset_filename()?
    ))
}

/// 为任意 GitHub Release 资产 URL 生成 ghfast.top 镜像兜底地址
/// （透传原 URL，下载内容一致，仍可做 SHA-256 完整性校验）。
pub fn mirror_download_url(asset_url: &str) -> String {
    format!("{DSH_MIRROR_PREFIX}{asset_url}")
}

/// 指定 tag 的 DeepSeek Harness 发行版下载地址。
///
/// 把 latest 下载地址中的 `releases/latest/download/` 替换为
/// `releases/download/<tag>/`，镜像/直连与平台文件名逻辑与最新版完全一致
/// （GitHub 的 tag 下载路径是固定的 release 资产地址，可被确定性推导）。
pub fn get_dsh_download_url_for_tag(tag: &str) -> Result<String, String> {
    let base = dsh_core_base_url().replace(
        "releases/latest/download/",
        &format!("releases/download/{tag}/"),
    );
    Ok(format!("{}{}", base, dsh_pkg_asset_filename()?))
}

/// 在 PATH 及常见安装目录中查找 node 可执行文件（不校验版本）
fn find_local_node_binary() -> Option<PathBuf> {
    let bin_name = if cfg!(windows) { "node.exe" } else { "node" };

    let path_dirs: Vec<PathBuf> =
        std::env::split_paths(&std::env::var_os("PATH").unwrap_or_default())
            .filter(|dir| !dir.as_os_str().is_empty())
            .collect();

    // macOS 上从 Finder/launchd 启动时 PATH 可能不完整，补充常见安装目录
    #[cfg(target_os = "macos")]
    let dirs: Vec<PathBuf> = {
        let mut dirs = path_dirs;
        dirs.extend([
            PathBuf::from("/opt/homebrew/bin"),
            PathBuf::from("/usr/local/bin"),
        ]);
        dirs
    };

    #[cfg(not(target_os = "macos"))]
    let dirs = path_dirs;

    for dir in dirs {
        let candidate = dir.join(bin_name);
        if candidate.is_file() && is_executable(&candidate) {
            return Some(candidate);
        }
    }
    None
}

#[cfg(unix)]
fn is_executable(path: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;
    path.metadata()
        .map(|meta| meta.permissions().mode() & 0o111 != 0)
        .unwrap_or(false)
}

#[cfg(not(unix))]
fn is_executable(_path: &Path) -> bool {
    true
}

/// 运行 `node --version` 并捕获输出
///
/// Windows 打包版是 GUI 进程（没有控制台），必须以 CREATE_NO_WINDOW 启动
/// node.exe，否则每次版本检查都会闪现一个黑色 cmd 窗口。
fn node_version_output(node: &Path) -> Option<std::process::Output> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new(node)
            .arg("--version")
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output()
            .ok()
    }
    #[cfg(not(windows))]
    {
        std::process::Command::new(node)
            .arg("--version")
            .output()
            .ok()
    }
}

/// 获取指定 Node.js 二进制的版本号（例如 "22.22.0"）
fn get_node_version_of(node: &Path) -> Option<String> {
    let output = node_version_output(node)?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let version = stdout.trim().trim_start_matches('v');
    if version.is_empty() {
        None
    } else {
        Some(version.to_string())
    }
}

/// 检测本地是否存在版本兼容的 Node.js 环境，返回其二进制路径
pub fn get_local_node_path() -> Option<PathBuf> {
    let node = find_local_node_binary()?;
    let version = get_node_version_of(&node)?;
    is_supported_node_version(&version).then_some(node)
}

/// 原生模块 ABI 探测结论：本地 Node 无法加载活动核心的原生模块时，本进程内
/// 强制改用捆绑运行时。
///
/// 由 `service::core::runtime::prepare_active_runtime` 在拉起 dsh 之前探测并设置：
/// 原生模块的 ABI 在构建期确定（预打包核心由 pkg 构建期的 Node 决定），而本地 Node
/// 只按 semver 挑选，可能与其不匹配（issue #441：Node 25 的 ABI 141 加载 ABI 137 的
/// `fs_ext.node`）。置位后所有 node 解析（服务进程、`DSH_NODE` 注入、运行环境展示）
/// 统一走捆绑运行时，避免各处各选一个运行时。
static PREFER_BUNDLED_NODE_RUNTIME: AtomicBool = AtomicBool::new(false);

/// 是否因原生模块 ABI 不匹配而强制使用捆绑运行时
pub fn prefer_bundled_node_runtime() -> bool {
    PREFER_BUNDLED_NODE_RUNTIME.load(Ordering::Relaxed)
}

/// 设置捆绑运行时偏好（仅由启动前的原生模块探测调用）
pub fn set_prefer_bundled_node_runtime(prefer: bool) {
    PREFER_BUNDLED_NODE_RUNTIME.store(prefer, Ordering::Relaxed);
}

/// 安装包资源中的 Node.js 二进制（资源缺失时返回 None）
pub fn bundled_node_binary(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
    let candidate = bundled_node_path(app_handle)?;
    candidate.is_file().then_some(candidate)
}

/// Node.js 二进制路径
///
/// Node 是安装包硬性资源。返回资源内的固定路径，绝不回退到系统或 AppData。
pub fn get_node_binary_path(app_handle: &tauri::AppHandle) -> PathBuf {
    if let Some(bundled) = bundled_node_binary(app_handle) {
        log::debug!("Using bundled Node.js runtime: {}", bundled.display());
        return bundled;
    }
    log::error!("Bundled Node.js runtime is missing from application resources");
    bundled_node_path(app_handle).unwrap_or_else(|| {
        PathBuf::from("__missing_bundled_runtime__").join(if cfg!(windows) {
            "node.exe"
        } else {
            "node"
        })
    })
}

fn bundled_target_name(os: &str, arch: &str) -> String {
    let os = if os == "macos" { "darwin" } else { os };
    format!("{os}-{arch}")
}

fn bundled_resource_path<R: Runtime>(app_handle: &AppHandle<R>) -> Option<PathBuf> {
    let resource_root = app_handle.path().resource_dir().ok()?;
    let target = bundled_target_name(env::consts::OS, env::consts::ARCH);
    Some(resource_root.join("resources").join("bundled").join(target))
}

fn bundled_node_path<R: Runtime>(app_handle: &AppHandle<R>) -> Option<PathBuf> {
    let root = bundled_resource_path(app_handle)?;
    let bin_name = if cfg!(windows) { "node.exe" } else { "node" };
    Some(
        root.join("node")
            .join(if cfg!(windows) { "" } else { "bin" })
            .join(bin_name),
    )
}

/// 当前平台随安装包提供的只读运行时资源目录。
pub fn bundled_resource_root<R: Runtime>(app_handle: &AppHandle<R>) -> Option<PathBuf> {
    let bundled = bundled_resource_path(app_handle)?;
    bundled.is_dir().then_some(bundled)
}

/// 安装包资源中的 Harness CLI（资源缺失时返回 None）。
pub fn bundled_dsh_binary<R: Runtime>(app_handle: &AppHandle<R>) -> Option<PathBuf> {
    let candidate = bundled_resource_path(app_handle)?
        .join("dsh")
        .join(DSH_ENTRY_RELATIVE);
    candidate.is_file().then_some(candidate)
}

/// Harness 发行版安装目录
pub fn get_dsh_install_path<R: Runtime>(app_handle: &AppHandle<R>) -> PathBuf {
    if let Some(root) = bundled_resource_root(app_handle) {
        let bundled = root.join("dsh");
        if bundled.is_dir() {
            return bundled;
        }
    }
    get_base_dir(app_handle)
        .join("dependencies")
        .join(DSH_CORE_DIR)
}

/// dsh CLI 入口
pub fn get_dsh_binary_path<R: Runtime>(app_handle: &AppHandle<R>) -> PathBuf {
    get_dsh_install_path(app_handle).join(DSH_ENTRY_RELATIVE)
}

/// pnpm 安装目录
pub fn get_pnpm_install_path<R: Runtime>(app_handle: &AppHandle<R>) -> PathBuf {
    get_base_dir(app_handle)
        .join("dependencies")
        .join(PNPM_CORE_DIR)
}

/// 捆绑 pnpm CLI 入口（纯 JS 发行，用 node 运行）
pub fn get_pnpm_binary_path<R: Runtime>(app_handle: &AppHandle<R>) -> PathBuf {
    get_pnpm_install_path(app_handle).join(PNPM_ENTRY_RELATIVE)
}

/// pnpm 官方/镜像下载前缀：国内走 npmmirror registry，其他直连 npmjs.org
fn pnpm_base_url(region: Region) -> &'static str {
    match region {
        Region::Domestic => PNPM_MIRROR_BASE_URL,
        Region::Overseas => PNPM_BASE_URL,
    }
}

/// pnpm 下载地址（纯 JS 发行，全平台同一 URL）
pub fn get_pnpm_download_url() -> String {
    format!(
        "{}pnpm-{}.tgz",
        pnpm_base_url(detect_region()),
        PNPM_VERSION
    )
}

/// Windows 免安装 Git 的安装目录。
pub fn get_mingit_install_path<R: Runtime>(app_handle: &AppHandle<R>) -> PathBuf {
    get_base_dir(app_handle)
        .join("dependencies")
        .join(MINGIT_CORE_DIR)
}

/// Windows 免安装 Git 的 CLI 入口。
pub fn get_mingit_binary_path<R: Runtime>(app_handle: &AppHandle<R>) -> PathBuf {
    get_mingit_install_path(app_handle).join(MINGIT_ENTRY_RELATIVE)
}

/// Windows MinGit 官方发行包文件名。
fn mingit_pkg_filename(arch: &str) -> Result<String, String> {
    match arch {
        "x86_64" => Ok(format!("MinGit-{MINGIT_VERSION}-64-bit.zip")),
        "aarch64" => Ok(format!("MinGit-{MINGIT_VERSION}-arm64.zip")),
        _ => Err(format!("MINGIT_PLATFORM_UNSUPPORTED: windows {arch}")),
    }
}

/// Windows MinGit 官方发行包下载地址。
pub fn get_mingit_download_url() -> Result<String, String> {
    Ok(format!(
        "{MINGIT_BASE_URL}{}",
        mingit_pkg_filename(env::consts::ARCH)?
    ))
}

/// Windows MinGit 官方发行包固定 SHA-256。
pub fn get_mingit_sha256() -> Result<&'static str, String> {
    match env::consts::ARCH {
        "x86_64" => Ok(MINGIT_X64_SHA256),
        "aarch64" => Ok(MINGIT_ARM64_SHA256),
        arch => Err(format!("MINGIT_PLATFORM_UNSUPPORTED: windows {arch}")),
    }
}

/// 在 PATH 中寻找可直接运行的系统 Git。
#[cfg(windows)]
pub fn find_system_git_binary() -> Option<PathBuf> {
    std::env::split_paths(&std::env::var_os("PATH").unwrap_or_default())
        .filter(|dir| !dir.as_os_str().is_empty())
        .map(|dir| dir.join("git.exe"))
        .find(|candidate| candidate.is_file() && git_binary_works(candidate))
}

/// 运行 Git 并捕获输出；GUI 进程下禁止闪现控制台窗口。
#[cfg(windows)]
fn git_output(binary: &Path, arg: &str) -> Option<std::process::Output> {
    use std::os::windows::process::CommandExt;

    std::process::Command::new(binary)
        .arg(arg)
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output()
        .ok()
}

/// 检查 Git HTTPS transport helper 的两种 Windows 发行布局。
///
/// 完整安装版通常把 helper 放在 `--exec-path`，而官方 MinGit 2.53 把它放在
/// 同一平台根目录（`mingw64` 或 `clangarm64`）下的 `bin`。只检查前者会在每次
/// 启动时把已安装且可用的 MinGit 误判为缺失，反复进入依赖安装流程（issue #166）。
#[cfg(any(windows, test))]
fn git_https_helper_exists(exec_path: &Path) -> bool {
    const HELPER: &str = "git-remote-https.exe";

    if exec_path.join(HELPER).is_file() {
        return true;
    }

    exec_path
        .parent()
        .and_then(Path::parent)
        .is_some_and(|platform_root| platform_root.join("bin").join(HELPER).is_file())
}

/// 检查 Git CLI 与 HTTPS transport helper 是否完整，避免 PATH 中只有残缺壳程序
/// （`git --version` 可成功但无法执行 `ls-remote`）阻止自动修复。
#[cfg(windows)]
fn git_binary_works(binary: &Path) -> bool {
    if !git_output(binary, "--version").is_some_and(|output| output.status.success()) {
        return false;
    }
    let Some(output) = git_output(binary, "--exec-path").filter(|output| output.status.success())
    else {
        return false;
    };
    let exec_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    !exec_path.is_empty() && git_https_helper_exists(Path::new(&exec_path))
}

/// 返回桌面端应注入子进程 PATH 的已选 Git `cmd` 目录。
#[cfg(windows)]
pub fn get_git_cmd_dir<R: Runtime>(app_handle: &AppHandle<R>) -> Option<PathBuf> {
    if let Some(system_git) = find_system_git_binary() {
        return system_git.parent().map(Path::to_path_buf);
    }
    let bundled = get_mingit_binary_path(app_handle);
    if bundled.is_file() && git_binary_works(&bundled) {
        return bundled.parent().map(Path::to_path_buf);
    }
    None
}

/// 非 Windows 平台依赖系统 Git，不额外注入目录。
#[cfg(not(windows))]
pub fn get_git_cmd_dir<R: Runtime>(_app_handle: &AppHandle<R>) -> Option<PathBuf> {
    None
}

/// 当前环境是否已有可供插件 Git 依赖使用的 Git。
#[cfg(windows)]
pub fn git_runtime_ready<R: Runtime>(app_handle: &AppHandle<R>) -> bool {
    find_system_git_binary().is_some() || git_binary_works(&get_mingit_binary_path(app_handle))
}

/// 非 Windows 平台不属于本次空白 Windows 环境的自动配置范围。
#[cfg(not(windows))]
pub fn git_runtime_ready<R: Runtime>(_app_handle: &AppHandle<R>) -> bool {
    true
}

/// Harness 发行版清单路径
pub fn get_dsh_package_json_path<R: Runtime>(app_handle: &AppHandle<R>) -> PathBuf {
    get_dsh_install_path(app_handle).join(DSH_MANIFEST_RELATIVE)
}

/// 用户主目录（Windows 取 `%USERPROFILE%`，Unix 取 `$HOME`）。
///
/// 不使用 dirs crate（未引入该依赖），与 Archer 的 `$HOME/.archer` 语义保持一致。
fn user_home_dir() -> Option<PathBuf> {
    #[cfg(windows)]
    let key = "USERPROFILE";
    #[cfg(not(windows))]
    let key = "HOME";
    std::env::var_os(key).map(PathBuf::from)
}

/// Harness 用户数据目录（$DSH_HOME）。
///
/// 与 Archer（`${DSH_HOME:-$HOME/.archer}`）保持一致：
/// - release 构建使用非空环境变量 `DSH_HOME`，否则默认 `~/.archer`；
/// - debug 构建始终使用 `~/.archer.dev`，忽略从旧 desktop checkout、终端或 release
///   shim 继承的 `DSH_HOME`，避免两个构建误用同一 profile 并发改写；
/// - debug 子进程由 launch 显式收到同一个 `~/.archer.dev`，开发版与生产版的会话、档案、
///   插件与主题因此互不干扰。
pub fn get_dsh_data_path<R: Runtime>(_app_handle: &AppHandle<R>) -> PathBuf {
    let dir_name = if cfg!(debug_assertions) {
        DSH_HOME_DEV_DIR_NAME
    } else {
        if let Some(home) = std::env::var_os("DSH_HOME") {
            if !home.is_empty() {
                return PathBuf::from(home);
            }
        }
        DSH_HOME_DIR_NAME
    };
    user_home_dir()
        .map(|home| home.join(dir_name))
        .unwrap_or_else(|| PathBuf::from(dir_name))
}

/// dsh 服务日志文件路径
///
/// debug 构建写入独立的 `dsh-web.dev.log`：开发版每次启动都会轮转日志，若与
/// 生产共用同一个文件，会把正在运行的生产版日志记录轮转覆盖掉。
pub fn get_service_log_path<R: Runtime>(app_handle: &AppHandle<R>) -> PathBuf {
    let name = if cfg!(debug_assertions) {
        "dsh-web.dev.log"
    } else {
        "dsh-web.log"
    };
    get_base_dir(app_handle).join("logs").join(name)
}

/// 捆绑的 Node.js 版本号
pub fn get_bundled_node_version() -> String {
    NODE_VERSION.trim_start_matches('v').to_string()
}

/// 当前实际使用的 Node.js 版本号。
pub fn get_active_node_version() -> String {
    get_bundled_node_version()
}

/// 读取任意 node 二进制的版本号（诊断信息用，例如 "v25.8.2"）
pub fn get_node_version_of_path(node: &Path) -> Option<String> {
    get_node_version_of(node)
}

fn parse_node_version(output: &str) -> Option<(u64, u64, u64)> {
    let version = output.trim().trim_start_matches('v');
    let mut parts = version.split('.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next()?.parse().ok()?;
    let patch = parts.next()?.parse().ok()?;
    Some((major, minor, patch))
}

/// 兼容性规则与当前 DSH `engines.node` 一致：v22.19.0+ 或 v24+；v23 不受支持。
fn is_supported_node_version(version: &str) -> bool {
    let Some((major, minor, _patch)) = parse_node_version(version) else {
        return false;
    };
    match major {
        22 => minor >= 19,
        major if major >= 24 => true,
        _ => false,
    }
}

/// 运行 `node --version` 并判断运行时是否兼容
pub fn is_runtime_compatible(app_handle: &tauri::AppHandle) -> bool {
    let node = get_node_binary_path(app_handle);
    if !node.exists() {
        return false;
    }
    let output = match node_version_output(&node) {
        Some(out) => out,
        None => return false,
    };
    if !output.status.success() {
        return false;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    is_supported_node_version(stdout.trim())
}

/// 从打包的 Harness 清单读取 dsh 版本（界面展示用）
pub fn get_dsh_version<R: Runtime>(app_handle: &AppHandle<R>) -> Option<String> {
    let manifest_path = get_dsh_package_json_path(app_handle);
    let content = fs::read_to_string(&manifest_path).ok()?;
    let manifest: serde_json::Value = serde_json::from_str(&content).ok()?;
    manifest
        .get("dependencies")
        .and_then(|deps| deps.get("@deepseek-ai/dsh"))
        .and_then(|value| value.as_str())
        .map(|value| {
            value
                .trim_start_matches(['^', '~', '=', '>', '<'])
                .to_string()
        })
        .or_else(|| {
            manifest
                .get("name")
                .and_then(|value| value.as_str())
                .filter(|name| *name == "@deepseek-ai/dsh")
                .and_then(|_| manifest.get("version"))
                .and_then(|value| value.as_str())
                .map(str::to_string)
        })
}

/// 侧边栏展示的运行时/版本/诊断信息
#[derive(Debug, Clone, Serialize)]
pub struct RuntimeInfo {
    pub app_version: String,
    pub dsh_version: Option<String>,
    pub node_version: String,
    pub service_url: String,
    pub data_dir: String,
    pub log_path: String,
    pub platform: String,
    pub arch: String,
}

pub fn runtime_info<R: Runtime>(app: &AppHandle<R>, port: u16) -> RuntimeInfo {
    RuntimeInfo {
        app_version: app.package_info().version.to_string(),
        dsh_version: get_dsh_version(app),
        node_version: get_active_node_version(),
        service_url: get_dsh_service_url(port),
        // 用户数据所在目录 = $DSH_HOME（release 为 ~/.archer，debug 为独立
        // ~/.archer.dev，见 get_dsh_data_path），不再是 AppData
        data_dir: get_dsh_data_path(app).to_string_lossy().into_owned(),
        log_path: get_service_log_path(app).to_string_lossy().into_owned(),
        platform: env::consts::OS.to_string(),
        arch: env::consts::ARCH.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 为文件布局测试生成互不冲突的临时目录。
    fn unique_runtime_test_dir(name: &str) -> PathBuf {
        use std::time::{SystemTime, UNIX_EPOCH};

        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time after epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("dsh-runtime-{name}-{}-{nonce}", std::process::id()))
    }

    /// 完整 Git 安装版把 HTTPS helper 直接放在 exec path 时仍应识别。
    #[test]
    fn git_https_helper_accepts_exec_path_layout() {
        let root = unique_runtime_test_dir("git-exec-helper");
        let exec_path = root.join("mingw64").join("libexec").join("git-core");
        fs::create_dir_all(&exec_path).expect("create exec path");
        fs::write(exec_path.join("git-remote-https.exe"), b"stub").expect("write helper");

        assert!(git_https_helper_exists(&exec_path));

        let _ = fs::remove_dir_all(root);
    }

    /// 官方 MinGit 2.53 的 helper 位于平台根目录下的 `bin`；缺失时仍必须拒绝。
    #[test]
    fn git_https_helper_accepts_mingit_bin_layout_and_rejects_missing() {
        for platform_root in ["mingw64", "clangarm64"] {
            let root = unique_runtime_test_dir(platform_root);
            let exec_path = root.join(platform_root).join("libexec").join("git-core");
            fs::create_dir_all(&exec_path).expect("create exec path");
            assert!(!git_https_helper_exists(&exec_path));

            let helper = root
                .join(platform_root)
                .join("bin")
                .join("git-remote-https.exe");
            fs::create_dir_all(helper.parent().expect("helper parent")).expect("create MinGit bin");
            fs::write(helper, b"stub").expect("write helper");

            assert!(git_https_helper_exists(&exec_path));

            let _ = fs::remove_dir_all(root);
        }
    }

    /// 当前 DSH 明确支持 22.19+ 与 24+，不支持 22.18 及整个 Node 23 系列。
    #[test]
    fn node_runtime_boundary_matches_current_dsh_engine() {
        assert!(!is_supported_node_version("v22.18.0"));
        assert!(is_supported_node_version("v22.19.0"));
        assert!(!is_supported_node_version("v22.19.0-rc.1"));
        assert!(!is_supported_node_version("v23.99.0"));
        assert!(is_supported_node_version("v24.0.0"));
        assert!(!is_supported_node_version("v24.0.0-nightly.1"));
    }

    #[test]
    fn mirror_url_prepends_ghfast_prefix() {
        let asset = "https://github.com/dsh-tauri-desk/deepseek-harness-pkg/releases/download/v1.0.0/deepseek-harness-pkg-windows.zip";
        assert_eq!(
            mirror_download_url(asset),
            format!("{DSH_MIRROR_PREFIX}{asset}")
        );
    }

    #[test]
    fn pnpm_base_url_switches_on_region() {
        assert_eq!(pnpm_base_url(Region::Overseas), PNPM_BASE_URL);
        assert_eq!(pnpm_base_url(Region::Domestic), PNPM_MIRROR_BASE_URL);
    }

    #[test]
    fn dsh_download_url_keeps_platform_filename_shape() {
        let dsh = get_dsh_download_url().expect("dsh url");
        assert!(dsh.starts_with("https://"));
        assert!(dsh.ends_with(".zip"));
    }

    #[test]
    fn mingit_pkg_filename_covers_supported_windows_architectures() {
        assert_eq!(
            mingit_pkg_filename("x86_64").expect("x64 MinGit asset"),
            format!("MinGit-{MINGIT_VERSION}-64-bit.zip")
        );
        assert_eq!(
            mingit_pkg_filename("aarch64").expect("ARM64 MinGit asset"),
            format!("MinGit-{MINGIT_VERSION}-arm64.zip")
        );
    }

    #[test]
    fn mingit_pkg_filename_rejects_unsupported_architecture() {
        let error = mingit_pkg_filename("x86").expect_err("unsupported MinGit architecture");
        assert_eq!(error, "MINGIT_PLATFORM_UNSUPPORTED: windows x86");
    }

    #[test]
    fn mingit_release_metadata_is_pinned_and_https() {
        assert!(MINGIT_BASE_URL.starts_with("https://github.com/git-for-windows/git/releases/"));
        assert!(MINGIT_BASE_URL.contains("v2.53.0.windows.2"));
        assert_eq!(MINGIT_X64_SHA256.len(), 64);
        assert_eq!(MINGIT_ARM64_SHA256.len(), 64);
        assert_ne!(MINGIT_X64_SHA256, MINGIT_ARM64_SHA256);
    }

    #[test]
    fn bundled_target_uses_distribution_platform_names() {
        assert_eq!(bundled_target_name("macos", "aarch64"), "darwin-aarch64");
        assert_eq!(bundled_target_name("linux", "x86_64"), "linux-x86_64");
        assert_eq!(bundled_target_name("windows", "x86_64"), "windows-x86_64");
    }
}
