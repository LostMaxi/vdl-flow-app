// ◎ VDL-FLOW Tauri 主程式
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("VDL-FLOW 啟動失敗");
}
