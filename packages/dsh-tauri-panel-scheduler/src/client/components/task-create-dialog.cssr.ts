import { cssr } from 'dsh-tauri-ui/client'

const { c } = cssr

/** 新建/编辑任务对话框（task-create-dialog.tsx）：官方 Modal 加宽。 */
export default c([
  c('.dshp-scheduler__modal', { width: 'min(640px,100%) !important' }),
  c('.dshp-scheduler__schedule-once', { flex: '1', minWidth: 0 }),
])
