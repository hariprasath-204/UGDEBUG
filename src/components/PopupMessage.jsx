import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const PopupMessage = ({ message, type = 'info', onClose, onConfirm }) => {
  if (!message) return null;

  let borderColor = '#ff003c';
  let glowColor = 'rgba(255, 0, 60, 0.45)';
  let Icon = Info;

  if (type === 'error') {
    borderColor = '#ff003c';
    glowColor = 'rgba(255, 0, 60, 0.6)';
    Icon = AlertCircle;
  } else if (type === 'success') {
    borderColor = '#00f59b';
    glowColor = 'rgba(0, 245, 155, 0.45)';
    Icon = CheckCircle2;
  } else if (type === 'warning') {
    borderColor = '#ff003c';
    glowColor = 'rgba(255, 0, 60, 0.5)';
    Icon = AlertCircle;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(6, 6, 8, 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      animation: 'fadeIn 0.2s ease-out forwards'
    }}>
      <div style={{
        background: 'rgba(18, 18, 24, 0.95)',
        border: `1px solid ${borderColor}`,
        boxShadow: `0 0 35px ${glowColor}`,
        borderRadius: 'var(--radius-md)',
        padding: '2.5rem',
        maxWidth: '460px',
        width: '90%',
        textAlign: 'center',
        animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '14px',
            borderRadius: '50%',
            background: type === 'success' ? 'rgba(0, 245, 155, 0.12)' : 'rgba(255, 0, 60, 0.12)',
            border: `1px solid ${borderColor}`,
            color: borderColor,
            boxShadow: `0 0 15px ${glowColor}`
          }}>
            <Icon size={40} />
          </div>
        </div>
        <h3 style={{ 
          color: '#ffffff', 
          fontFamily: 'var(--font-heading)', 
          fontSize: '1.15rem', 
          marginBottom: '2rem',
          lineHeight: '1.6',
          letterSpacing: '0.5px'
        }}>
          {message}
        </h3>
        {onConfirm ? (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={onClose}
              className="btn-secondary" 
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                fontWeight: '700',
                padding: '12px 20px',
                letterSpacing: '1px',
                fontSize: '0.95rem'
              }}
            >
              CANCEL
            </button>
            <button 
              onClick={() => { onConfirm(); onClose(); }}
              className="btn-primary" 
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #ff003c 0%, #b7002b 100%)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                fontWeight: '800',
                padding: '12px 20px',
                letterSpacing: '1px',
                fontSize: '0.95rem',
                boxShadow: '0 0 20px rgba(255, 0, 60, 0.55)'
              }}
            >
              CONFIRM
            </button>
          </div>
        ) : (
          <button 
            onClick={onClose}
            className="btn-primary" 
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #ff003c 0%, #b7002b 100%)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              fontWeight: '800',
              padding: '12px 20px',
              letterSpacing: '1px',
              fontSize: '0.95rem',
              boxShadow: '0 0 20px rgba(255, 0, 60, 0.55)'
            }}
          >
            ACKNOWLEDGE
          </button>
        )}
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default PopupMessage;
