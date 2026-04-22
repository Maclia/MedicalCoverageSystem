import React, { useMemo, useState } from 'react';
import DigitalCard from './DigitalCard';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CardRecord, downloadCardPayload, useMemberCards } from './cardApi';
import {
  Download,
  Smartphone,
  CreditCard,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface CardGalleryProps {
  memberId: number;
  className?: string;
}

export const CardGallery: React.FC<CardGalleryProps> = ({ memberId, className = '' }) => {
  const { data: cards = [], isLoading: loading, refetch } = useMemberCards(memberId);
  const { toast } = useToast();
  const [selectedCard, setSelectedCard] = useState<CardRecord | null>(null);
  const [showQRCode, setShowQRCode] = useState(true);

  const handleDownloadDigitalCard = async (cardId: number) => {
    try {
      const payload = await downloadCardPayload(cardId);
      const dataStr = JSON.stringify(payload, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `digital-card-${cardId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Unable to download card payload',
        variant: 'destructive',
      });
    }
  };

  const getCardIcon = (cardType: string) => {
    switch (cardType) {
      case 'digital':
        return <Smartphone className="w-4 h-4" />;
      case 'physical':
        return <CreditCard className="w-4 h-4" />;
      case 'both':
        return <div className="flex gap-1"><Smartphone className="w-4 h-4" /><CreditCard className="w-4 h-4" /></div>;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'lost':
      case 'stolen':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      // Active cards first, then by creation date (newest first)
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [cards]);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sortedCards.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Cards Found</h3>
        <p className="text-gray-600 mb-4">
          You don't have any insurance cards yet. Contact your administrator to request a card.
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Insurance Cards</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQRCode(!showQRCode)}
          >
            {showQRCode ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showQRCode ? 'Hide' : 'Show'} QR Code
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCards.map((card) => (
          <Card key={card.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {getCardIcon(card.cardType)}
                  <CardTitle className="text-lg">
                    {card.cardType === 'digital' ? 'Digital Card' :
                     card.cardType === 'physical' ? 'Physical Card' : 'Digital & Physical'}
                  </CardTitle>
                </div>
                <Badge className={getStatusColor(card.status)}>
                  {card.status}
                </Badge>
              </div>

              {/* Warning for inactive cards */}
              {(card.status === 'lost' || card.status === 'stolen' || card.status === 'expired') && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">
                      {card.status === 'expired' ? 'Card has expired' :
                       card.status === 'lost' ? 'Card reported as lost' :
                       'Card reported as stolen'}
                    </span>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent>
              {/* Card Preview */}
              <div className="mb-4 flex justify-center">
                <DigitalCard
                  card={card}
                  compact={true}
                  showQRCode={showQRCode && card.cardType === 'digital'}
                  className="transform scale-75 origin-center"
                />
              </div>

              {/* Card Actions */}
              <div className="space-y-2">
                {(card.cardType === 'digital' || card.cardType === 'both') && card.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDownloadDigitalCard(card.id)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Digital Card
                  </Button>
                )}

                {card.cardType === 'physical' && (
                  <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                    <div className="font-medium mb-1">Physical Card</div>
                    <div>Status: {card.status}</div>
                    {card.deliveryAddress && (
                      <div className="mt-1 text-xs">Shipped to your address</div>
                    )}
                    {card.trackingNumber && (
                      <div className="mt-1">
                        <span className="font-medium">Tracking:</span> {card.trackingNumber}
                      </div>
                    )}
                  </div>
                )}

              {/* Issue Date and Expiration */}
              <div className="text-xs text-gray-500 space-y-1">
                {card.issuedAt && <div>Issued: {new Date(card.issuedAt).toLocaleDateString()}</div>}
                {card.expiresAt && <div>Expires: {new Date(card.expiresAt).toLocaleDateString()}</div>}
              </div>
              </div>

              {/* Card Details Toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3"
                onClick={() => setSelectedCard(selectedCard?.id === card.id ? null : card)}
              >
                {selectedCard?.id === card.id ? 'Hide Details' : 'View Details'}
              </Button>
            </CardContent>

            {/* Expanded Details */}
            {selectedCard?.id === card.id && (
              <div className="border-t p-4 space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Card Information</h4>
                  <div className="text-sm space-y-1">
                    <div><strong>Card ID:</strong> #{card.id}</div>
                    {card.templateId && <div><strong>Template ID:</strong> #{card.templateId}</div>}
                    {card.templateType && <div><strong>Template:</strong> {card.templateType}</div>}
                    <div><strong>QR Code:</strong> {card.qrCodeData ? 'Available' : 'Not Generated'}</div>
                    {card.lastUsedAt && (
                      <div><strong>Last Used:</strong> {new Date(card.lastUsedAt).toLocaleString()}</div>
                    )}
                    {card.deactivatedAt && (
                      <div><strong>Deactivated:</strong> {new Date(card.deactivatedAt).toLocaleString()}</div>
                    )}
                  </div>
                </div>

                {card.deactivationReason && (
                  <div>
                    <h4 className="font-medium mb-2">Deactivation Reason</h4>
                    <p className="text-sm text-gray-600">{card.deactivationReason}</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to Use Your Cards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 font-bold text-xs">1</span>
            </div>
            <div>
              <h4 className="font-medium">Digital Cards</h4>
              <p className="text-sm text-gray-600">
                Show the QR code to healthcare providers for instant verification. Download the card to your mobile wallet for easy access.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 font-bold text-xs">2</span>
            </div>
            <div>
              <h4 className="font-medium">Physical Cards</h4>
              <p className="text-sm text-gray-600">
                Use your physical card at any healthcare provider. The card contains your member ID and verification details.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 font-bold text-xs">3</span>
            </div>
            <div>
              <h4 className="font-medium">Card Issues</h4>
              <p className="text-sm text-gray-600">
                If your card is lost, stolen, or damaged, contact support immediately for a replacement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CardGallery;
