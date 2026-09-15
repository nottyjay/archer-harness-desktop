//! 安装可变的辅助依赖（pnpm；Windows 缺失系统 Git 时再安装 MinGit）。
//!
//! Node.js 与 Harness 是安装包的硬性资源，不属于运行时安装任务。缺失时由
//! `bridge::lifecycle` 直接报告安装包损坏，禁止回退到联网下载。

use crate::config;
use crate::service::download;
use tauri::Manager;

use super::process::{has_owned_process, stop, terminate_stale_harness_processes};

pub async fn install(app_handle: &tauri::AppHandle) -> Result<(), String> {
    log::info!("Starting auxiliary dependency installation");

    if has_owned_process() {
        log::info!("Stopping running Harness service before dependency installation");
        stop(app_handle.clone()).await?;
    }

    {
        let handle = app_handle.clone();
        tauri::async_runtime::spawn_blocking(move || {
            terminate_stale_harness_processes(&handle);
        })
        .await
        .map_err(|e| format!("STOP_FAILED: {e}"))?;
    }

    let window = app_handle
        .get_webview_window("main")
        .ok_or("Failed to get main window")?;

    #[cfg(windows)]
    let tasks: Vec<Box<dyn download::Installable>> =
        vec![Box::new(download::Pnpm), Box::new(download::Git)];
    #[cfg(not(windows))]
    let tasks: Vec<Box<dyn download::Installable>> = vec![Box::new(download::Pnpm)];

    let mut tracker = download::ProgressTracker::new(&window, tasks.len() * 2);
    log::info!("Auxiliary task list created, {} tasks total", tasks.len());

    for (index, task) in tasks.iter().enumerate() {
        if task.check_installed(app_handle) {
            log::debug!("Task {} already installed, skipping", index + 1);
            tracker.skip_phases(2);
            continue;
        }

        tracker.start_phase(
            "download",
            &format!(
                "{} {}",
                config::i18n::t("install.downloading"),
                task.title()
            ),
        );
        let url = task.get_download_url()?;
        let name = url.rsplit('/').next().unwrap_or("").to_string();
        log::debug!("Download URL: {url}");
        let buffer = download::download_file_from_sources(&tracker, vec![url]).await?;

        let expected_digest = match task.kind() {
            download::InstallKind::Pnpm => config::PNPM_SHA256,
            #[cfg(windows)]
            download::InstallKind::Git => config::get_mingit_sha256()?,
        };
        download::verify_sha256(&buffer, expected_digest)?;
        tracker.end_phase();

        tracker.start_phase(
            "extract",
            &format!("{} {}", config::i18n::t("install.extracting"), task.title()),
        );
        download::ensure_extract(&tracker, name, buffer, task.get_install_path(app_handle)).await?;
        tracker.end_phase();
    }

    tracker.update(
        100.0,
        config::i18n::t("install.done"),
        "All tasks completed".into(),
    );
    Ok(())
}
