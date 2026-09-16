//! 托盘图标状态：常态使用实心图标，未读时只在两张缓存图之间闪烁。

use std::{sync::Mutex, time::Duration};

use tauri::async_runtime::JoinHandle;
use tauri::{image::Image, AppHandle, Runtime};
use tokio::time::sleep;

pub const TRAY_ICON_ID: &str = "main-tray";
const BLINK_INTERVAL_MS: u64 = 500;
#[cfg(target_os = "macos")]
const MACOS_TRAY_BYTES: &[u8] = include_bytes!("../../icons/macos-tray.png");

struct TrayIconStateInner {
    base_icon: Image<'static>,
    unread_icon: Image<'static>,
    transparent_icon: Image<'static>,
    /// macOS template glyph vs a full-color (avatar) tile.
    uses_template: bool,
    unread_count: u32,
    blink_task: Option<JoinHandle<()>>,
}

/// 托盘图标缓存与未读闪烁状态。
pub struct TrayIconState {
    inner: Mutex<TrayIconStateInner>,
}

impl TrayIconState {
    pub fn new(app: &AppHandle) -> Self {
        let base_icon = initial_icon(app);
        let unread_icon = build_unread_icon(&base_icon);
        let transparent_icon = build_transparent_icon(&base_icon);
        Self {
            inner: Mutex::new(TrayIconStateInner {
                base_icon,
                unread_icon,
                transparent_icon,
                uses_template: cfg!(target_os = "macos"),
                unread_count: 0,
                blink_task: None,
            }),
        }
    }

    pub fn notify<R: Runtime>(&self, app: &AppHandle<R>, avatar_png: Option<Vec<u8>>) {
        if let Some(bytes) = avatar_png {
            if let Ok(icon) = Image::from_bytes(&bytes) {
                if let Ok(mut guard) = self.inner.lock() {
                    guard.base_icon = make_opaque(&icon.to_owned(), [31, 41, 55]);
                    guard.unread_icon = build_unread_icon(&guard.base_icon);
                    guard.transparent_icon = build_transparent_icon(&guard.base_icon);
                    guard.uses_template = false;
                    if let Some(task) = guard.blink_task.take() {
                        task.abort();
                    }
                }
            }
        }
        if let Ok(mut guard) = self.inner.lock() {
            guard.unread_count = guard.unread_count.saturating_add(1);
        }
        self.apply_icon(app, true);
        self.start_blink(app.clone());
        self.update_tooltip(app);
    }

    pub fn clear<R: Runtime>(&self, app: &AppHandle<R>) {
        if let Ok(mut guard) = self.inner.lock() {
            guard.unread_count = 0;
            if let Some(task) = guard.blink_task.take() {
                task.abort();
            }
        }
        self.apply_icon(app, false);
        self.update_tooltip(app);
    }

    fn apply_icon<R: Runtime>(&self, app: &AppHandle<R>, unread: bool) {
        let Some(tray) = app.tray_by_id(TRAY_ICON_ID) else {
            return;
        };
        let (icon, uses_template) = match self.inner.lock().ok().map(|guard| {
            let icon = if unread {
                guard.unread_icon.clone()
            } else {
                guard.base_icon.clone()
            };
            (icon, guard.uses_template)
        }) {
            Some(pair) => pair,
            None => return,
        };
        set_tray_image(&tray, Some(icon), uses_template);
        // Explicitly restore visibility after every image update. Some menu bar/tray hosts
        // remove an icon when a transient transparent image is applied.
        let _ = tray.set_visible(true);
    }

    fn update_tooltip<R: Runtime>(&self, app: &AppHandle<R>) {
        let Some(tray) = app.tray_by_id(TRAY_ICON_ID) else {
            return;
        };
        let count = self
            .inner
            .lock()
            .map(|guard| guard.unread_count)
            .unwrap_or(0);
        let name = app.package_info().name.clone();
        let tooltip = if count > 0 {
            format!("{name} ({count})")
        } else {
            name
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }

    fn start_blink<R: Runtime>(&self, app: AppHandle<R>) {
        let Ok(mut guard) = self.inner.lock() else {
            return;
        };
        if guard.blink_task.is_some() {
            return;
        }
        let base = guard.base_icon.clone();
        let transparent = guard.transparent_icon.clone();
        let uses_template = guard.uses_template;
        let task_app = app.clone();
        guard.blink_task = Some(tauri::async_runtime::spawn(async move {
            let mut show_transparent = true;
            loop {
                sleep(Duration::from_millis(BLINK_INTERVAL_MS)).await;
                let Some(tray) = task_app.tray_by_id(TRAY_ICON_ID) else {
                    return;
                };
                let icon = if show_transparent {
                    transparent.clone()
                } else {
                    base.clone()
                };
                show_transparent = !show_transparent;
                set_tray_image(&tray, Some(icon), uses_template);
                let _ = tray.set_visible(true);
            }
        }));
    }
}

#[tauri::command]
pub fn clear_tray_notifications(
    app: AppHandle,
    state: tauri::State<'_, TrayIconState>,
) -> Result<(), String> {
    state.clear(&app);
    Ok(())
}

pub fn initial_icon<R: Runtime>(app: &AppHandle<R>) -> Image<'static> {
    #[cfg(target_os = "macos")]
    {
        if let Ok(icon) = Image::from_bytes(MACOS_TRAY_BYTES) {
            // Keep alpha. macOS 26 already draws a glass plate behind extras;
            // compositing onto [31, 41, 55] made a second opaque tile and a black blob.
            // Template images ignore RGB and tint from the alpha mask.
            return icon.to_owned();
        }
    }
    app.default_window_icon()
        .map(|icon| make_opaque(&icon.clone().to_owned(), [31, 41, 55]))
        .unwrap_or_else(|| Image::new_owned(vec![31, 41, 55, 255], 1, 1))
}

fn set_tray_image<R: Runtime>(
    tray: &tauri::tray::TrayIcon<R>,
    icon: Option<Image<'_>>,
    as_template: bool,
) {
    #[cfg(target_os = "macos")]
    {
        // tray-icon's set_icon() hardcodes is_template=false, which would
        // immediately undo TrayIconBuilder::icon_as_template(true).
        let _ = tray.set_icon_with_as_template(icon, as_template);
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = as_template;
        let _ = tray.set_icon(icon);
    }
}

fn make_opaque(icon: &Image<'_>, background: [u8; 3]) -> Image<'static> {
    let rgba = icon
        .rgba()
        .chunks_exact(4)
        .flat_map(|pixel| {
            let alpha = pixel[3] as u16;
            [
                ((pixel[0] as u16 * alpha + background[0] as u16 * (255 - alpha)) / 255) as u8,
                ((pixel[1] as u16 * alpha + background[1] as u16 * (255 - alpha)) / 255) as u8,
                ((pixel[2] as u16 * alpha + background[2] as u16 * (255 - alpha)) / 255) as u8,
                255,
            ]
        })
        .collect();
    Image::new_owned(rgba, icon.width(), icon.height())
}

fn build_unread_icon(icon: &Image<'_>) -> Image<'static> {
    let mut rgba = icon.rgba().to_vec();
    for pixel in rgba.chunks_exact_mut(4) {
        pixel[0] = pixel[0].saturating_add(24);
        pixel[1] = pixel[1].saturating_add(18);
        pixel[2] = pixel[2].saturating_add(10);
    }
    Image::new_owned(rgba, icon.width(), icon.height())
}

fn build_transparent_icon(icon: &Image<'_>) -> Image<'static> {
    let mut rgba = icon.rgba().to_vec();
    for pixel in rgba.chunks_exact_mut(4) {
        pixel[3] = 0;
    }
    Image::new_owned(rgba, icon.width(), icon.height())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn make_opaque_fills_transparent_pixels() {
        let icon = Image::new_owned(vec![255, 0, 0, 128, 0, 0, 0, 0], 2, 1);
        let opaque = make_opaque(&icon, [20, 40, 60]);
        assert_eq!(opaque.rgba()[3], 255);
        assert_eq!(opaque.rgba()[7], 255);
        assert_eq!(&opaque.rgba()[4..7], &[20, 40, 60]);
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn macos_tray_png_is_template_safe() {
        let icon = Image::from_bytes(MACOS_TRAY_BYTES).expect("macos-tray.png");
        let rgba = icon.rgba();
        assert_eq!(rgba[3], 0, "corner must stay transparent");
        let mut opaque_black = 0u32;
        for pixel in rgba.chunks_exact(4) {
            if pixel[3] == 0 {
                continue;
            }
            assert_eq!(
                &pixel[..3],
                &[0, 0, 0],
                "template glyphs must be black+alpha, got {pixel:?}"
            );
            if pixel[3] == 255 {
                opaque_black += 1;
            }
        }
        assert!(opaque_black > 0, "expected a solid black glyph");
    }
}
