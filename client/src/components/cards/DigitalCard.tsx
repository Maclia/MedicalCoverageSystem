import React, { useState, useEffect } from 'react';
import { MemberCard, CardTemplate } from '@shared/schema';

// Fallback QR Code component when qrcode.react is not available
const QRCodeSVG: React.FC<{
  value: string;
  size: number;
  level?: string;
  includeMargin?: boolean;
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
        padding: '2px'
      }}
      title={value}
    >
      QR
    </div>
  );
};

interface DigitalCardProps {
  card: MemberCard;
  member?: {
    id: number;
    name: string;
    memberType: string;
    dateOfBirth: string;
  };
  template?: CardTemplate;
  showQRCode?: boolean;
  compact?: boolean;
  className?: string;
}

export const DigitalCard: React.FC<DigitalCardProps> = ({
  card,
  member,
  template,
  showQRCode = true,
  compact = false,
  className = ''
}) => {
  const [cardData, setCardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCardData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/cards/member/download-card/${card.id}`);
        const result = await response.json();

        if (result.success) {
          setCardData(result.data);
        }
      } catch (error) {
        console.error('Error loading card data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (showQRCode) {
      loadCardData();
    } else {
      setIsLoading(false);
    }
  }, [card.id, showQRCode]);

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 h-48 w-80 rounded-lg"></div>
      </div>
    );
  }

  const cardDesign = template ? JSON.parse(template.cardDesign || '{}') : {
    backgroundColor: '#1e40af',
    textColor: '#ffffff',
    logoPosition: 'top-left',
    memberInfoPosition: 'center'
  };

  const cardStyle = {
    backgroundColor: cardDesign.backgroundColor || '#1e40af',
    color: cardDesign.textColor || '#ffffff',
    minHeight: compact ? '120px' : '200px',
    width: compact ? '280px' : '340px'
  };

  const formatExpirationDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: '2-digit',
      year: '2-digit'
    });
  };

  const getMemberName = () => {
    if (member) return member.name;
    if (cardData?.member) return cardData.member.name;
    return 'Card Holder';
  };

  const getMemberType = () => {
    if (member) return member.memberType;
    if (cardData?.member) return cardData.member.memberType;
    return 'Member';
  };

  return (
    <div
      className={`relative rounded-lg shadow-lg overflow-hidden ${className}`}
      style={cardStyle}
    >
      {/* Card Header */}
      <div className="flex justify-between items-start p-4">
        {/* Logo */}
        <div className={`absolute ${cardDesign.logoPosition === 'top-left' ? 'top-4 left-4' : cardDesign.logoPosition === 'top-right' ? 'top-4 right-4' : ''}`}>
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-bold text-xs">MC</span>
          </div>
        </div>

        {/* Card Type Badge */}
        <div className="absolute top-4 right-4">
          <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs font-medium">
            {card.cardType.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`px-4 pb-4 ${cardDesign.memberInfoPosition === 'center' ? 'text-center' : ''}`}
      >
        {!compact && (
          <>
            <h3 className="text-lg font-bold mb-1">
              {getMemberName()}
            </h3>
            <p className="text-sm opacity-90 mb-3">
              {getMemberType()}
            </p>
          </>
        )}

        {/* Card Number */}
        <div className="mb-3">
          <div className="text-xs opacity-75 mb-1">Card Number</div>
          <div className="font-mono text-sm">
            {card.id.toString().padStart(16, '0').replace(/(.{4})/g, '$1 ').trim()}
          </div>
        </div>

        {!compact && (
          <>
            {/* Member ID */}
            <div className="mb-3">
              <div className="text-xs opacity-75 mb-1">Member ID</div>
              <div className="text-sm font-medium">
                #{card.memberId.toString().padStart(8, '0')}
              </div>
            </div>

            {/* Expiration */}
            <div className="flex justify-between items-end">
              <div>
                <div className="text-xs opacity-75 mb-1">Valid Thru</div>
                <div className="text-sm font-medium">
                  {formatExpirationDate(card.expiresAt)}
                </div>
              </div>

              {/* Status */}
              <div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  card.cardStatus === 'active'
                    ? 'bg-green-500 bg-opacity-20 text-green-100'
                    : 'bg-red-500 bg-opacity-20 text-red-100'
                }`}>
                  {card.cardStatus}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* QR Code Overlay */}
      {showQRCode && cardData?.qrCodeData && (
        <div className="absolute bottom-4 right-4 bg-white p-2 rounded-lg">
          <QRCodeSVG
            value={cardData.qrCodeData}
            size={compact ? 40 : 60}
            level="H"
            includeMargin={false}
            fgColor="#000000"
            bgColor="#FFFFFF"
          />
        </div>
      )}

      {/* Card Network Branding */}
      <div className="absolute bottom-4 left-4">
        <div className="text-xs opacity-75">MediCoverage Network</div>
      </div>
    </div>
  );
};

export default DigitalCard;