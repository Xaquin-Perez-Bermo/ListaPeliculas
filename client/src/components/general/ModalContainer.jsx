import ReactDOM from 'react-dom';
import { useEffect } from 'react';

const ModalContainer = ({ children, onClose, t }) => {
    //Cerrar con la tecla Escape
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Usamos Portal para que el modal "flote" sobre toda la app
    return ReactDOM.createPortal(
        <div className="modal-container">
            <button
                className="modal-backdrop"
                onClick={onClose}
                type="button"
                aria-label={t('closePanelAria')}
                title={t('closeByClickTitle')}
            />
            <div className="modal">
                {children}
            </div>
        </div>,
        document.body
    );
};

export default ModalContainer;