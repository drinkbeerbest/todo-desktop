import { version } from '../../package.json'
import { useState } from 'react'
import { Sun, Moon, Monitor, Download, Upload, Sparkles, Check, ShieldCheck, Keyboard, Bell, ArrowUpRight } from 'lucide-react'
import { Modal, ModalHeader, Toggle } from './Primitives'
import type { AppData, Settings as SettingValues } from '../types'

export default function Settings({ data, onUpdate, onClose, onExport, onImport }: { data: AppData; onUpdate: (value: Partial<SettingValues>) => void; onClose: () => void; onExport: () => void; onImport: () => void }) {
  const [tab, setTab] = useState('general')
  return <Modal title="设置" onClose={onClose} className="settings-modal"><ModalHeader title="让留白，更合你意" subtitle="一些恰到好处的偏好。" onClose={onClose} />
    <div className="settings-tabs"><button className={tab === 'general' ? 'active' : ''} onClick={() => setTab('general')}>通用</button><button className={tab === 'data' ? 'active' : ''} onClick={() => setTab('data')}>数据与备份</button><button className={tab === 'shortcuts' ? 'active' : ''} onClick={() => setTab('shortcuts')}>快捷键</button></div>
    <div className="settings-body">{tab === 'general' && <><div className="setting-section-label">外观</div><div className="theme-options">{([{ id: 'light', name: '浅色', Icon: Sun }, { id: 'dark', name: '深色', Icon: Moon }, { id: 'system', name: '跟随系统', Icon: Monitor }] as const).map(({ id, name, Icon }) => <button key={id} className={`theme-option ${data.settings.theme === id ? 'selected' : ''}`} aria-pressed={data.settings.theme === id} onClick={() => onUpdate({ theme: id })}><div className={`theme-preview ${id}`}><span /><span /><span /></div><span><Icon size={13} />{name}{data.settings.theme === id && <Check size={13} />}</span></button>)}</div>
      <div className="settings-row"><div><strong><Sparkles size={15} />完成时的小庆祝</strong><p>在勾选框旁，绽开一束轻盈的礼花</p></div><Toggle label="完成礼花" checked={data.settings.confetti} onChange={() => onUpdate({ confetti: !data.settings.confetti })} /></div>
      <div className="settings-row"><div><strong>减少动态效果</strong><p>使用更轻的过渡，关闭礼花动效</p></div><Toggle label="减少动态效果" checked={data.settings.reduceMotion} onChange={() => onUpdate({ reduceMotion: !data.settings.reduceMotion })} /></div>
      <div className="settings-row"><div><strong>紧凑列表</strong><p>在同样的空间里，看到更多待办</p></div><Toggle label="紧凑列表" checked={data.settings.compact} onChange={() => onUpdate({ compact: !data.settings.compact })} /></div>
      <div className="settings-row"><div><strong><Bell size={14} />到时提醒</strong><p>应用运行时，提醒已设置日期和时间的待办</p></div><Toggle label="到时提醒" checked={data.settings.notifications} onChange={() => onUpdate({ notifications: !data.settings.notifications })} /></div>
    </>}
    {tab === 'data' && <><div className="privacy-card"><ShieldCheck size={24} strokeWidth={1.4} /><h3>你的日常，只属于你</h3><p>待办和笔记保存在这台电脑上。<br />无需账号，也可以离线使用。</p></div><div className="backup-actions"><button onClick={onExport}><Download size={17} /><span><strong>导出备份</strong><small>将全部待办和笔记保存为 JSON 文件</small></span><ArrowUpRight size={15} /></button><button onClick={onImport}><Upload size={17} /><span><strong>导入备份</strong><small>从之前导出的留白备份中恢复</small></span><ArrowUpRight size={15} /></button></div><p className="backup-hint">建议定期备份，给重要的事多一份安心。</p></>}
    {tab === 'shortcuts' && <><div className="shortcut-intro"><Keyboard size={21} /><p>少一点点击，多一点从容。</p></div><div className="shortcut-list">{[['新建待办 / 笔记', 'Ctrl', 'N'], ['搜索全部内容', 'Ctrl', 'K'], ['打开设置', 'Ctrl', ','], ['切换到今天', 'Alt', '1'], ['切换到全部待办', 'Alt', '2'], ['添加正在输入的待办', 'Enter'], ['关闭弹窗 / 详情', 'Esc']].map(([label, ...keys]) => <div key={label}><span>{label}</span><span>{keys.map(k => <kbd key={k}>{k}</kbd>)}</span></div>)}</div></>}
    </div><div className="settings-footer"><span className="mini-logo">留</span><span>留白</span><span>{version}</span><span className="settings-motto">给重要的事，一点空间。</span></div>
  </Modal>
}
