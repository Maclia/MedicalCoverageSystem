import React, { useState } from 'react';
import { Button } from '../../features/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../features/ui/card';
import { Input } from '../../features/ui/input';
import { Label } from '../../features/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../features/ui/select';
import { Alert, AlertDescription } from '../../features/ui/alert';
import { Badge } from '../../features/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCardHistory, useVerifyCardMutation } from './cardApi';
import { Loader2, CheckCircle, XCircle, Camera, Wifi, HandTap } from 'lucide-react';

interface CardVerificationPortalProps {
  providerId: string;
  onVerificationComplete?: (result: any) => void;
  className?: string;
}

export const CardVerificationPortal: React.FC<CardVerificationPortalProps> = ({
  providerId,
  onVerificationComplete,
  className = ''
}) => {
  const [verificationMethod, setVerificationMethod] = useState<'qr_scan' | 'manual_entry' | 'nfc_tap'>('qr_scan');
  const [qrCodeData, setQrCodeData] = useState('');
  const [lastVerification, setLastVerification] = useState<any>(null);
  const [location, setLocation] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const { toast } = useToast();
  const verifyMutation = useVerifyCardMutation();
  const verifiedCardId = lastVerification?.card?.id;
  const { data: recentHistory = [], isLoading: loadingHistory } = useCardHistory(verifiedCardId);

  const handleVerifyCard = async () => {
    if (!qrCodeData.trim()) {
      toast({
        title: 'QR code required',
        description: 'Please enter QR code data before verifying.',
        variant: 'destructive',
      });
      return;
    }

    setLastVerification(null);

    try {
      const result = await verifyMutation.mutateAsync({
        qrCodeData: qrCodeData.trim(),
        providerId,
        verificationType: verificationMethod,
        location: location || undefined,
        deviceInfo: deviceInfo || undefined
      });

      setLastVerification(result);
      onVerificationComplete?.(result);

      if (result.verification?.result === 'success') {
        setQrCodeData('');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      setLastVerification({
        verification: {
          result: 'failed'
        },
        message
      });

      toast({
        title: 'Verification failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const getVerificationIcon = (method: string) => {
    switch (method) {
      case 'qr_scan':
        return <Camera className="w-5 h-5" />;
      case 'manual_entry':
        return <HandTap className="w-5 h-5" />;
      case 'nfc_tap':
        return <Wifi className="w-5 h-5" />;
      default:
        return <Camera className="w-5 h-5" />;
    }
  };

  const getStatusColor = (result: string | undefined) => {
    if (result === 'success') return 'bg-green-100 text-green-800 border-green-200';
    if (result === 'failed') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (result: string | undefined) => {
    if (result === 'success') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (result === 'failed') return <XCircle className="w-5 h-5 text-red-600" />;
    return null;
  };

  return (
    <div className={`max-w-2xl mx-auto space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-6 h-6" />
            Insurance Card Verification Portal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium mb-3 block">Verification Method</Label>
            <Select value={verificationMethod} onValueChange={(value: any) => setVerificationMethod(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select verification method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qr_scan">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    QR Code Scan
                  </div>
                </SelectItem>
                <SelectItem value="manual_entry">
                  <div className="flex items-center gap-2">
                    <HandTap className="w-4 h-4" />
                    Manual Entry
                  </div>
                </SelectItem>
                <SelectItem value="nfc_tap">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    NFC Tap
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="qrCode" className="text-base font-medium mb-3 block">
              QR Code Data
              {verificationMethod === 'qr_scan' && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  (Scan QR code with camera or enter manually)
                </span>
              )}
            </Label>
            <Input
              id="qrCode"
              value={qrCodeData}
              onChange={(e) => setQrCodeData(e.target.value)}
              placeholder="Enter QR code data or scan with camera"
              className="font-mono"
              disabled={verifyMutation.isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location" className="text-sm font-medium mb-2 block">
                Location (Optional)
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Office room, desk number, etc."
                disabled={verifyMutation.isPending}
              />
            </div>

            <div>
              <Label htmlFor="deviceInfo" className="text-sm font-medium mb-2 block">
                Device Info (Optional)
              </Label>
              <Input
                id="deviceInfo"
                value={deviceInfo}
                onChange={(e) => setDeviceInfo(e.target.value)}
                placeholder="Scanner type, device ID, etc."
                disabled={verifyMutation.isPending}
              />
            </div>
          </div>

          <Button
            onClick={handleVerifyCard}
            disabled={verifyMutation.isPending || !qrCodeData.trim()}
            className="w-full"
            size="lg"
          >
            {verifyMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying Card...
              </>
            ) : (
              <>
                {getVerificationIcon(verificationMethod)}
                <span className="ml-2">
                  {verificationMethod === 'qr_scan' ? 'Verify QR Code' :
                   verificationMethod === 'manual_entry' ? 'Verify Card Manually' :
                   'Verify NFC Card'}
                </span>
              </>
            )}
          </Button>

          {lastVerification && (
            <Alert className={getStatusColor(lastVerification.verification?.result)}>
              <div className="flex items-start gap-3">
                {getStatusIcon(lastVerification.verification?.result)}
                <div className="flex-1">
                  <AlertDescription>
                    <div className="font-medium mb-2">
                      {lastVerification.message || (
                        lastVerification.verification?.result === 'success'
                          ? 'Card verified successfully'
                          : 'Card verification failed'
                      )}
                    </div>

                    {lastVerification.verification?.result === 'success' && lastVerification.card ? (
                      <div className="space-y-2 mt-3 p-3 bg-white/60 rounded">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Member ID:</strong> #{lastVerification.card.memberId}
                          </div>
                          <div>
                            <strong>Card Number:</strong> {lastVerification.card.cardNumber}
                          </div>
                          <div>
                            <strong>Card Status:</strong> {lastVerification.card.status}
                          </div>
                          <div>
                            <strong>Expiry Date:</strong> {new Date(lastVerification.card.expiryDate).toLocaleDateString()}
                          </div>
                        </div>

                        {lastVerification.verification && (
                          <div className="text-sm mt-3 p-2 bg-blue-50 rounded">
                            <strong>Verification Details:</strong>
                            <div>Method: {lastVerification.verification.method}</div>
                            <div>Fraud Risk Score: {lastVerification.verification.fraudRiskScore}/100</div>
                            {lastVerification.verification.fraudIndicators?.length > 0 && (
                              <div>Indicators: {lastVerification.verification.fraudIndicators.join(', ')}</div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 mt-3">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {lastVerification.card.status}
                          </Badge>
                          <Badge variant="outline">
                            Card ID: #{lastVerification.card.id}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm mt-2">
                        <strong>Reason:</strong> {lastVerification.message || 'Unknown error occurred'}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Verification Instructions</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>- <strong>QR Code Scan:</strong> Position camera over the QR code on the digital card</li>
              <li>- <strong>Manual Entry:</strong> Enter the QR code data manually if scanning is not possible</li>
              <li>- <strong>NFC Tap:</strong> Tap NFC-enabled card on the reader device</li>
              <li>- Ensure good lighting and steady hand for best scanning results</li>
              <li>- Contact support if verification fails multiple times</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Verifications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Persisted verification events for the last card you checked appear here after a lookup.
          </p>

          {loadingHistory ? (
            <div className="text-center py-8 text-gray-500">
              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
              <p className="text-sm">Loading verification history...</p>
            </div>
          ) : recentHistory.length > 0 ? (
            <div className="space-y-3">
              {recentHistory.map((event) => (
                <div key={event.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{event.verificationMethod}</div>
                      <div className="text-sm text-gray-600">
                        {event.verificationTimestamp
                          ? new Date(event.verificationTimestamp).toLocaleString()
                          : 'Unknown time'}
                      </div>
                    </div>
                    <Badge variant={event.verificationResult === 'success' ? 'default' : 'destructive'}>
                      {event.verificationResult}
                    </Badge>
                  </div>
                  {typeof event.fraudRiskScore === 'number' && (
                    <div className="mt-2 text-sm text-gray-600">
                      Fraud risk score: {event.fraudRiskScore}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              No persisted verification history yet. Verify a card to see backend events here.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-600">
            <h4 className="font-medium mb-2">Common Issues:</h4>
            <ul className="space-y-1 ml-4">
              <li>- QR code not scanning: Try better lighting or manual entry</li>
              <li>- Card not found: Verify the QR code data is correct</li>
              <li>- Card inactive: Member may need to update their coverage</li>
              <li>- System errors: Try refreshing the page and try again</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Contact Support
            </Button>
            <Button variant="outline" size="sm">
              View Documentation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CardVerificationPortal;
