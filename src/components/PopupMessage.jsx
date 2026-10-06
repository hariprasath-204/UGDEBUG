import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const PopupMessage = ({ message, type = 'info', onClose, onConfirm }) => {
  if (!message) return null;

  let borderColor = '#007fd7';
  let glowColor = 'rgba(0, 127, 215, 0.45)';
  let Icon = Info;

  if (type === 'error') {
    borderColor = '#de0606';
    glowColor = 'rgba(222, 6, 6, 0.6)';
    Icon = AlertCircle;
  } else if (type === 'success') {
    borderColor = '#00f59b';
    glowColor = 'rgba(0, 245, 155, 0.45)';
    Icon = CheckCircle2;
  } else if (type === 'warning') {
    borderColor = '#de0606';
    glowColor = 'rgba(222, 6, 6, 0.5)';
    Icon = AlertCircle;
  }

  const isPositive = type === 'success' || type === 'info';
  const iconBg = isPositive 
    ? (type === 'success' ? 'rgba(0, 245, 155, 0.12)' : 'rgba(0, 127, 215, 0.12)')
    : 'rgba(222, 6, 6, 0.12)';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(6, 6, 8, 0.88)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      animation: 'fadeIn 0.2s ease-out forwards'
    }}>
      <div style={{
        background: '#0a0a0e',
        border: `1.5px solid ${borderColor}`,
        boxShadow: `0 0 35px ${glowColor}, inset 0 0 15px rgba(63, 63, 63, 0.3)`,
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
            background: iconBg,
            border: `1.5px solid ${borderColor}`,
            color: borderColor,
            boxShadow: `0 0 15px ${glowColor}`
          }}>
            <Icon size={38} />
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
                background: 'rgba(63, 63, 63, 0.4)',
                color: '#e2e2e2',
                border: '1px solid #3f3f3f',
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
                background: 'linear-gradient(135deg, #de0606 0%, #ac0202 100%)',
                color: '#ffffff',
                border: '1px solid rgba(226, 226, 226, 0.25)',
                fontWeight: '800',
                padding: '12px 20px',
                letterSpacing: '1px',
                fontSize: '0.95rem',
                boxShadow: '0 0 20px rgba(222, 6, 6, 0.5)'
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
              background: 'linear-gradient(135deg, #de0606 0%, #ac0202 100%)',
              color: '#ffffff',
              border: '1px solid rgba(226, 226, 226, 0.25)',
              fontWeight: '800',
              padding: '12px 20px',
              letterSpacing: '1px',
              fontSize: '0.95rem',
              boxShadow: '0 0 20px rgba(222, 6, 6, 0.5)'
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
