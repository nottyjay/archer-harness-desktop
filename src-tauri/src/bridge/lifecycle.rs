//! 依赖安装、自愈与 Harness 服务生命周期管理。
//!
//! 覆盖三块：安装包内 Node.js/Harness 的存在性检查、辅助依赖安装与记录自愈、
//! Harness 服务进程的启停与状态查询，以及运行时三件套的就绪判断。

use std::sync::OnceLock;

use crate::config;
use crate::service::cli;
use crate::service::download::{self, Installable};
use crate::service::workflow;
use tauri::AppHandle;

/// 并发安装互斥：状态位守卫进程的“是否正在安装”判断
/// （status::Status::Installing 会被失败路径/其它流程改写，不能作为互斥依据），
/// 改用独立的进程内互斥锁覆盖完整安装生命周期，避免两路并发 install 的
/// TOCTOU 与安装失败后状态卡死导致后续请求被静默跳过。
static INSTALL_LOCK: OnceLock<tokio::sync::Mutex<()>> = OnceLock::new();

fn install_lock() -> &'static tokio::sync::Mutex<()> {
    INSTALL_LOCK.get_or_init(|| tokio::sync::Mutex::new(()))
}

/// 安装失败后把状态从 Installing 复位，避免后续调用被“正在安装”卡死。
/// 仅在失败路径调用；成功路径保持原有状态语义（由前端随后 launch 续接）。
fn reset_install_status(app_handle: &AppHandle) {
    workflow::status::set_status(workflow::status::Status::Stopped);
    workflow::status::emit_status(app_handle);
}

/// 按当前设置同步命令行集成（shim + PATH 注册）。
///
/// 安装/更新流程的收尾步骤，失败只记日志、不阻断主流程。
fn sync_cli_link(app_handle: &AppHandle) {
    let setting = config::get_store_dat_setting(app_handle);
    let result = if setting.cli_link_enabled {
        cli::ensure(app_handle)
    } else {
        cli::remove(app_handle)
    };
    if let Err(e) = result {
        log::warn!("cli link sync failed: {e}");
    }
}

fn require_bundled_runtime(app_handle: &AppHandle) -> Result<(), String> {
    let Some(node) = config::bundled_node_binary(app_handle) else {
        return Err(
            "NODE_BUNDLED_RESOURCE_MISSING: bundled Node.js is missing from this installer"
                .to_string(),
        );
    };
    // 文件存在 ≠ 能 exec：资源被原地覆写后内核会以 SIGKILL 拦下 exec，这里就地
    // 探测并自愈，否则失败会推迟到插件安装阶段，只留下一句无输出的 exit code 1
    // （见 [`config::ensure_bundled_node_executable`]）。
    config::ensure_bundled_node_executable(&node)?;
    if config::bundled_dsh_binary(app_handle).is_none() {
        return Err(
            "DSH_BUNDLED_RESOURCE_MISSING: compiled Harness resource is missing from this installer"
                .to_string(),
        );
    }
    Ok(())
}

/// 校验安装包运行时，并按需安装 pnpm/Windows Git 等辅助依赖。
///
/// 启动逻辑由前端显式调用 `launch_harness` 完成，避免重复拉起进程。
#[tauri::command]
pub async fn install_dependencies(app_handle: AppHandle) -> Result<bool, String> {
    // 并发/重入防护：使用独立互斥锁而非依赖 Status::Installing——
    // 失败路径会复位状态，若用状态判断则一次失败后所有后续调用都会被
    // “Installation process already running” 静默跳过直到重启应用。
    let Ok(_install_guard) = install_lock().try_lock() else {
        log::info!("Installation process already running, skipping");
        return Ok(false);
    };

    require_bundled_runtime(&app_handle)?;

    // pnpm 是 dsh plugin 子命令的运行时依赖（v0.3.0 起随环境安装）；老版本
    // 升级后 `installed` 已为 true 会跳过环境安装，捆绑 pnpm 可能从未落盘，
    // 需一并纳入"已就绪"判定，缺失时由 workflow::install 按任务补齐。
    let pnpm_ok = download::Pnpm.check_installed(&app_handle);
    // Windows 空白环境还必须有可执行的 Git，才能安装 github:/git+ssh: 插件。
    // 非 Windows 返回 true，保持原有依赖集合不变。
    let git_ok = config::git_runtime_ready(&app_handle);

    if pnpm_ok && git_ok {
        if !config::get_store_dat_setting(&app_handle).installed {
            log::info!(
                "Runtime files already present although store says not installed, healing installed flag"
            );
            let mut setting = config::get_store_dat_setting(&app_handle);
            setting.installed = true;
            config::set_store_dat_setting(&app_handle, setting);
        }
        sync_cli_link(&app_handle);
        return Ok(false);
    }

    log::info!("Auxiliary dependencies missing, starting installation process");
    workflow::status::set_status(workflow::status::Status::Installing);
    workflow::status::emit_status(&app_handle);
    if let Err(e) = workflow::install(&app_handle).await {
        log::error!("Installation failed, resetting status: {e}");
        reset_install_status(&app_handle);
        return Err(e);
    }
    log::debug!("Installation completed, marked as installed");
    let mut setting = config::get_store_dat_setting(&app_handle);
    setting.installed = true;
    config::set_store_dat_setting(&app_handle, setting);
    sync_cli_link(&app_handle);
    Ok(false)
}

/// DSH is immutable for a desktop build; update checks are intentionally disabled.
#[tauri::command]
pub async fn check_dsh_update(
    _app_handle: AppHandle,
) -> Result<Option<download::LatestDshPkg>, String> {
    Ok(None)
}

/// 启动 Harness 服务
#[tauri::command]
pub async fn launch_harness(app_handle: AppHandle) -> Result<(), String> {
    workflow::launch(app_handle).await
}

/// 停止 Harness 服务
#[tauri::command]
pub async fn shutdown_harness(app_handle: AppHandle) -> Result<(), String> {
    workflow::stop(app_handle).await
}

/// 重启 Harness 服务
#[tauri::command]
pub async fn restart_harness(app_handle: AppHandle) -> Result<(), String> {
    workflow::restart(app_handle).await
}

/// 进入安全模式：确保安全档案存在并切换为当前档案（不重启，由前端走标准重启链路）。
///
/// 错误界面「安全模式」按钮的入口：安全档案只含 web 模板核心 bundles、不带
/// 用户插件/补丁层，启动失败的插件（如 pending waiting for service）被隔离，
/// 应用先恢复可用；用户在档案列表切回原档案即退出安全模式。
///
/// 档案目录一旦存在就绝不重建，因此里面可能残留此前被装进去的用户插件（内置插件
/// 自愈与首次引导安装都作用于「当时的活动档案」）；这些插件由启动前的清除流程卸载
/// （见 `service::plugin::safe::purge_user_plugins_in_safe_profile`），本命令只负责
/// 切档案——服务仍在运行时删除插件目录不安全，必须等重启后的 spawn 之前再清。
#[tauri::command]
pub async fn enter_safe_mode(app_handle: AppHandle) -> Result<(), String> {
    crate::service::profile::ensure_safe_profile(&app_handle)?;
    crate::service::profile::set_active(&app_handle, crate::service::profile::SAFE_PROFILE)?;
    Ok(())
}

/// 获取当前 Harness 服务状态
#[tauri::command]
pub fn get_dsh_status() -> workflow::status::Status {
    workflow::status::get_status()
}

/// 运行时文件是否已全部在盘（Node / Dsh / pnpm；Windows 还要求 Git 可用，
/// 纯本地检查、无网络）。
///
/// 判定条件与 `install_dependencies` 的「启动自愈」捷径完全一致：桌面端自更新
/// （MSI 强杀进程）后 store 可能被复位或损坏显示「未安装」，但运行时文件其实
/// 已就绪——此时前端跳过安装/下载界面，交给 install_dependencies 内部自愈
/// 补记 installed 后直接启动，避免自动重开时闪现误导用户的安装界面。
#[tauri::command]
pub fn runtime_ready(app_handle: AppHandle) -> bool {
    config::bundled_node_binary(&app_handle).is_some()
        && config::bundled_dsh_binary(&app_handle).is_some()
        && download::Pnpm.check_installed(&app_handle)
        && config::git_runtime_ready(&app_handle)
}

#[cfg(test)]
mod tests {
    use super::install_lock;

    #[test]
    fn install_lock_is_exclusive_while_held() {
        let lock = install_lock();
        // 首持获得锁
        let guard = lock.try_lock();
        assert!(guard.is_ok());
        // 未释放前再次 try_lock 应失败，排除并发/重入（这正是替换 Status::Installing 守卫的目的）
        assert!(lock.try_lock().is_err());
        // 释放后可重新获取
        drop(guard);
        assert!(lock.try_lock().is_ok());
    }
}
