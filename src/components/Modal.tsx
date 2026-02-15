import React from 'react';

type Props = {
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ onClose, children }: Props) {
  const handleBackdropClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    // Only close if clicking the backdrop, not the content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  return (
    <div className="modal-backdrop" onClick={handleBackdropClick} aria-modal="true" role="dialog">
      <div className="modal-content">
        {children}
      </div>
    </div>
  );
}
