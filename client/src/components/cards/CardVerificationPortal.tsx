import React, { useState } from 'react';
import { CardVerificationRequest, CardVerificationResponse } from '../../../server/services/cardManagementService';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Loader2, CheckCircle, XCircle, Camera, Wifi, HandTap } from 'lucide-react';

interface CardVerificationPortalProps {
  providerId: string;
  onVerificationComplete?: (result: CardVerificationResponse) => void;
  className?: string;
}

export const CardVerificationPortal: React.FC<CardVerificationPortalProps> = ({
  providerId,
  onVerificationComplete,
  className = ''
}) => {
  const [verificationMethod, setVerificationMethod] = useState<'qr_scan' | 'manual_entry' | 'nfc_tap'>('qr_scan');
  const [qrCodeData, setQrCodeData] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastVerification, setLastVerification] = useState<CardVerificationResponse | null>(null);
  const [location, setLocation] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');

  const handleVerifyCard = async () => {
    if (!qrCodeData.trim()) {
      alert('Please enter QR code data');
      return;
    }

    setIsVerifying(true);
    setLastVerification(null);

    try {
      const verificationRequest: CardVerificationRequest = {
        qrCodeData: qrCodeData.trim(),
        providerId,
        verificationType: verificationMethod,
        location: location || undefined,
        deviceInfo: deviceInfo || undefined
      };

      const response = await fetch('/api/cards/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationRequest),
      });

      const result = await response.json();

      if (result.success) {
        setLastVerification(result.data);
        onVerificationComplete?.(result.data);

        // Clear form on successful verification
        if (result.data.valid) {
          setQrCodeData('');
        }
      } else {
        throw new Error(result.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Error verifying card:', error);
      setLastVerification({
        valid: false,
        reason: error instanceof Error ? error.message : 'Verification failed'
      });
    } finally {
      setIsVerifying(false);
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

  const getStatusColor = (valid: boolean | undefined) => {
    if (valid === true) return 'bg-green-100 text-green-800 border-green-200';
    if (valid === false) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (valid: boolean | undefined) => {
    if (valid === true) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (valid === false) return <XCircle className="w-5 h-5 text-red-600" />;
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
          {/* Verification Method Selection */}
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

          {/* QR Code Input */}
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
              disabled={isVerifying}
            />
          </div>

          {/* Optional Fields */}
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
                disabled={isVerifying}
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
                disabled={isVerifying}
              />
            </div>
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleVerifyCard}
            disabled={isVerifying || !qrCodeData.trim()}
            className="w-full"
            size="lg"
          >
            {isVerifying ? (
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

          {/* Verification Result */}
          {lastVerification && (
            <Alert className={getStatusColor(lastVerification.valid)}>
              <div className="flex items-start gap-3">
                {getStatusIcon(lastVerification.valid)}
                <div className="flex-1">
                  <AlertDescription>
                    <div className="font-medium mb-2">
                      {lastVerification.valid ? '✓ Card Verified Successfully' : '✗ Card Verification Failed'}
                    </div>

                    {lastVerification.valid && lastVerification.card && lastVerification.member ? (
                      <div className="space-y-2 mt-3 p-3 bg-white bg-opacity-50 rounded">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Member Name:</strong> {lastVerification.member.name}
                          </div>
                          <div>
                            <strong>Member ID:</strong> #{lastVerification.member.id}
                          </div>
                          <div>
                            <strong>Card Type:</strong> {lastVerification.card.cardType}
                          </div>
                          <div>
                            <strong>Member Type:</strong> {lastVerification.member.memberType}
                          </div>
                        </div>

                        {lastVerification.member.dateOfBirth && (
                          <div className="text-sm">
                            <strong>Date of Birth:</strong> {new Date(lastVerification.member.dateOfBirth).toLocaleDateString()}
                          </div>
                        )}

                        <div className="flex gap-2 mt-3">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Active
                          </Badge>
                          <Badge variant="outline">
                            Card ID: #{lastVerification.card.id}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm mt-2">
                        <strong>Reason:</strong> {lastVerification.reason || 'Unknown error occurred'}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Verification Instructions</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>QR Code Scan:</strong> Position camera over the QR code on the digital card</li>
              <li>• <strong>Manual Entry:</strong> Enter the QR code data manually if scanning is not possible</li>
              <li>• <strong>NFC Tap:</strong> Tap NFC-enabled card on the reader device</li>
              <li>• Ensure good lighting and steady hand for best scanning results</li>
              <li>• Contact support if verification fails multiple times</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Recent Verification History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Verifications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Your recent verification history will appear here. This helps track provider interactions and card usage.
          </p>

          <div className="text-center py-8 text-gray-500">
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">Loading verification history...</p>
          </div>
        </CardContent>
      </Card>

      {/* Help & Support */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-600">
            <h4 className="font-medium mb-2">Common Issues:</h4>
            <ul className="space-y-1 ml-4">
              <li>• QR code not scanning - Try better lighting or manual entry</li>
              <li>• Card not found - Verify the QR code data is correct</li>
              <li>• Card inactive - Member may need to update their coverage</li>
              <li>• System errors - Try refreshing the page and try again</li>
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