import React, { useState } from 'react';

/**
 * DigitalCard Component
 * Displays member insurance card in digital format with customizable templates
 */

// Simple QR Code SVG fallback component
const QRCodeSVG: React.FC<{
  value: string;
  size: number;
  fgColor?: string;
  bgColor?: string;
}> = ({ value, size, fgColor = '#000000', bgColor = '#FFFFFF' }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `2px solid ${fgColor}`,
        borderRadius: '4px',
        fontSize: '8px',
        color: fgColor,
        textAlign: 'center',
        padding: '2px',
      }}
      title={value}
    >
      QR: {value.substring(0, 8)}...
    </div>
  );
};

interface DigitalCardProps {
  card: {
    id: number;
    memberId: number;
    cardNumber: string;
    cardType: string;
    status: string;
    expiryDate?: Date | string;
    expiresAt?: Date | string | null;
    qrCodeData?: string | null;
    personalizationData?: string;
    templateType?: string;
  };
  template?: {
    backgroundColor?: string;
    foregroundColor?: string;
    accentColor?: string;
    logoUrl?: string;
  };
  compact?: boolean;
  showQR?: boolean;
  onDownload?: () => void;
  className?: string;
}

export const DigitalCard: React.FC<DigitalCardProps> = ({
  card,
  template,
  compact = false,
  showQR = true,
  onDownload,
  className = '',
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const defaultTemplate = {
    backgroundColor: '#1e3a8a',
    foregroundColor: '#ffffff',
    accentColor: '#3b82f6',
    logoUrl: '/medical-logo.svg',
  };

  const finalTemplate = { ...defaultTemplate, ...template };
  const expiryDate = new Date(card.expiryDate ?? card.expiresAt ?? Date.now());
  const formattedExpiry = `${String(expiryDate.getMonth() + 1).padStart(2, '0')}/${expiryDate.getFullYear()}`;

  const maskCardNumber = (cardNumber: string): string => {
    const parts = cardNumber.split('-');
    if (parts.length >= 4) {
      return `${parts[0]}-${parts[1]}-****-${parts[3]}`;
    }
    return '****';
  };

  const getStatusColor = (): string => {
    switch (card.status) {
      case 'active':
        return '#10b981';
      case 'inactive':
        return '#ef4444';
      case 'expired':
        return '#f59e0b';
      case 'lost':
        return '#a855f7';
      case 'stolen':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  if (compact) {
    return (
      <div
        className={`flex items-center justify-between p-4 rounded-lg border-2 ${className}`}
        style={{
          backgroundColor: finalTemplate.backgroundColor,
          borderColor: finalTemplate.accentColor,
          color: finalTemplate.foregroundColor,
        }}
      >
        <div>
          <div className="text-sm font-semibold">Insurance Card</div>
          <div className="text-xs opacity-75 mt-1">{maskCardNumber(card.cardNumber)}</div>
          <div className="text-xs opacity-75">Expires: {formattedExpiry}</div>
        </div>
        <div
          className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: getStatusColor(),
            color: '#ffffff',
          }}
        >
          {card.status.toUpperCase()}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md mx-auto ${className}`} onClick={() => setIsFlipped(!isFlipped)}>
      {!isFlipped ? (
        // Front of card
        <div
          className="rounded-2xl p-8 shadow-2xl cursor-pointer transition-all hover:shadow-xl"
          style={{
            backgroundColor: finalTemplate.backgroundColor,
            color: finalTemplate.foregroundColor,
            aspectRatio: '1.58',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-start">
            {finalTemplate.logoUrl && (
              <img src={finalTemplate.logoUrl} alt="Logo" className="h-8 opacity-90" />
            )}
            <span className="text-xl font-bold tracking-wider">Medical Coverage</span>
          </div>

          {/* Member Info */}
          <div>
            <div className="text-sm opacity-75 mb-2">CARDHOLDER</div>
            <div className="text-lg font-semibold mb-6">Member ID: {card.memberId}</div>

            {/* Card Number */}
            <div className="text-xs opacity-60 tracking-widest mb-2">CARD NUMBER</div>
            <div className="text-xl font-mono tracking-wider">{maskCardNumber(card.cardNumber)}</div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end">
            <div>
              <div className="text-xs opacity-75 mb-1">VALID THRU</div>
              <div className="text-lg font-mono font-bold">{formattedExpiry}</div>
            </div>
            <div
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{
                backgroundColor: getStatusColor(),
                color: '#ffffff',
              }}
            >
              {card.status.toUpperCase()}
            </div>
          </div>

          {/* Flip indicator */}
          <div className="text-center mt-4 text-xs opacity-50">Click to flip</div>
        </div>
      ) : (
        // Back of card
        <div
          className="rounded-2xl p-8 shadow-2xl cursor-pointer transition-all hover:shadow-xl"
          style={{
            backgroundColor: finalTemplate.backgroundColor,
            color: finalTemplate.foregroundColor,
            aspectRatio: '1.58',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
          }}
        >
          {/* Security Strip */}
          <div
            className="w-full h-12 rounded -mx-8 mb-4"
            style={{
              backgroundColor: finalTemplate.accentColor,
              opacity: 0.3,
            }}
          >
            <div className="text-center pt-3 text-xs font-mono opacity-75">Security Verified</div>
          </div>

          {/* QR Code */}
          {showQR && (
            <div className="flex justify-center mb-6">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG
                  value={card.qrCodeData || ''}
                  size={150}
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              </div>
            </div>
          )}

          {/* Customer Service */}
          <div className="text-center text-xs">
            <div className="opacity-75 mb-2">CUSTOMER SERVICE</div>
            <div className="font-mono">1-800-MEDICAL-1</div>
            <div className="text-xs opacity-60 mt-2">www.medicalcoverage.com</div>
          </div>

          {/* Flip indicator */}
          <div className="text-center mt-4 text-xs opacity-50">Click to flip</div>
        </div>
      )}

      {/* Download Button */}
      {onDownload && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          className="mt-4 w-full py-2 px-4 rounded-lg font-semibold transition-all hover:opacity-90"
          style={{
            backgroundColor: finalTemplate.accentColor,
            color: finalTemplate.backgroundColor,
          }}
        >
          Download Card
        </button>
      )}
    </div>
  );
};

export default DigitalCard;
