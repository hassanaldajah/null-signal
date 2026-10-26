import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { Rnd } from 'react-rnd';
import { play } from '../audio/sfx';
import { useI18n } from '../i18n';
import { APPS } from './apps';
import { useWindows, type WindowState } from './windowStore';

export default function Window({ win }: { win: WindowState }) {
  const { t } = useI18n();
  const { close, focus, toggleMinimize, toggleMaximize, setRect } = useWindows();
  const app = APPS[win.id];
  const App = app.component;
  const small = window.innerWidth < 760;
  const maximized = win.maximized || small;

  return (
    <Rnd
      className="os-window-rnd"
      style={{ zIndex: win.z, display: win.minimized ? 'none' : undefined }}
      size={maximized ? { width: '100%', height: '100%' } : { width: win.width, height: win.height }}
      position={maximized ? { x: 0, y: 0 } : { x: win.x, y: win.y }}
      minWidth={320}
      minHeight={220}
      bounds="parent"
      dragHandleClassName="os-titlebar"
      disableDragging={maximized}
      enableResizing={!maximized}
      onMouseDown={() => focus(win.id)}
      onTouchStart={() => focus(win.id)}
      onDragStop={(_, data) => setRect(win.id, { x: data.x, y: data.y })}
      onResizeStop={(_, __, ref, ___, position) =>
        setRect(win.id, { width: ref.offsetWidth, height: ref.offsetHeight, x: position.x, y: position.y })}
    >
      <motion.div
        className="os-window panel"
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="os-titlebar" onDoubleClick={() => toggleMaximize(win.id)}>
          <span className="os-title-icon mono">{app.icon}</span>
          <span className="os-title">{t(app.title)}</span>
          <span className="os-controls">
            <button aria-label={t('os.minimize')} onClick={() => { play('click'); toggleMinimize(win.id); }}>–</button>
            {!small && <button aria-label={t('os.maximize')} onClick={() => { play('click'); toggleMaximize(win.id); }}>□</button>}
            <button className="close" aria-label={t('os.close')} onClick={() => { play('close'); close(win.id); }}>×</button>
          </span>
        </div>
        <div className="os-body">
          <Suspense fallback={<div className="label" style={{ padding: 16 }}>{t('common.loading')}</div>}>
            <App />
          </Suspense>
        </div>
      </motion.div>
    </Rnd>
  );
}
