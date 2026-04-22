import React, { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  CardRecord,
  useAllCards,
  useCardAnalytics,
  useCardBatches,
  useCardTemplates,
  useGenerateCardMutation,
  useUpdateCardStatusMutation,
} from './cardApi';
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit,
  Package,
  CreditCard,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';

interface CardManagementDashboardProps {
  className?: string;
}

export const CardManagementDashboard: React.FC<CardManagementDashboardProps> = ({ className = '' }) => {
  const { data: cards = [], isLoading: loadingCards, refetch: refetchCards } = useAllCards();
  const { data: templates = [], isLoading: loadingTemplates, refetch: refetchTemplates } = useCardTemplates();
  const { data: batches = [], isLoading: loadingBatches, refetch: refetchBatches } = useCardBatches();
  const { data: analytics, isLoading: loadingAnalytics, refetch: refetchAnalytics } = useCardAnalytics();
  const updateCardStatusMutation = useUpdateCardStatusMutation();
  const generateCardMutation = useGenerateCardMutation();
  const { toast } = useToast();

  const [cardStatusFilter, setCardStatusFilter] = useState<string>('all');
  const [cardTypeFilter, setCardTypeFilter] = useState<string>('all');
  const [batchStatusFilter, setBatchStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [newMemberId, setNewMemberId] = useState('');
  const [newCardType, setNewCardType] = useState<'digital' | 'physical' | 'both'>('digital');

  const loading = loadingCards || loadingTemplates || loadingBatches || loadingAnalytics;

  const filteredCards = useMemo(() => {
    return [...cards]
      .filter((card) => (cardStatusFilter === 'all' ? true : card.status === cardStatusFilter))
      .filter((card) => (cardTypeFilter === 'all' ? true : card.cardType === cardTypeFilter))
      .filter((card) => {
        if (!searchTerm.trim()) {
          return true;
        }

        const term = searchTerm.trim().toLowerCase();
        return (
          card.id.toString().includes(term) ||
          card.memberId.toString().includes(term) ||
          card.cardNumber.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [cardStatusFilter, cardTypeFilter, cards, searchTerm]);

  const filteredBatches = useMemo(() => {
    return [...batches]
      .filter((batch) => (batchStatusFilter === 'all' ? true : batch.productionStatus === batchStatusFilter))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [batchStatusFilter, batches]);

  const stats = analytics ?? {
    cards: {
      total: cards.length,
      active: cards.filter((card) => card.status === 'active').length,
      pending: cards.filter((card) => card.status === 'pending').length,
      digital: cards.filter((card) => card.cardType === 'digital' || card.cardType === 'both').length,
      physical: cards.filter((card) => card.cardType === 'physical' || card.cardType === 'both').length,
    },
    verification: {
      total: 0,
      successful: 0,
      failed: 0,
    },
    recentVerifications: [],
  };

  const refreshAll = async () => {
    await Promise.all([
      refetchCards(),
      refetchTemplates(),
      refetchBatches(),
      refetchAnalytics(),
    ]);
  };

  const handleGenerateCard = async () => {
    const memberId = Number(newMemberId);

    if (!memberId) {
      toast({
        title: 'Member ID required',
        description: 'Enter the member ID to generate a persisted card record.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await generateCardMutation.mutateAsync({
        memberId,
        cardType: newCardType,
      });

      setNewMemberId('');
      toast({
        title: 'Card requested',
        description: `A ${newCardType} card was generated and saved for member #${memberId}.`,
      });
    } catch (error) {
      toast({
        title: 'Card generation failed',
        description: error instanceof Error ? error.message : 'Unable to generate card',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (card: CardRecord, status: CardRecord['status']) => {
    try {
      await updateCardStatusMutation.mutateAsync({ cardId: card.id, status });
      toast({
        title: 'Card updated',
        description: `Card #${card.id} is now ${status}.`,
      });
    } catch (error) {
      toast({
        title: 'Status update failed',
        description: error instanceof Error ? error.message : 'Unable to update status',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'lost': return 'bg-red-100 text-red-800';
      case 'stolen': return 'bg-red-100 text-red-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBatchStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Package className="w-4 h-4" />;
      case 'in_production': return <RefreshCw className="w-4 h-4" />;
      case 'shipped': return <Package className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-32 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold">Card Management</h1>
          <p className="text-gray-600">Manage persisted insurance cards, templates, production batches, and verification activity.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshAll} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cards</p>
                <p className="text-2xl font-bold">{stats.cards.total}</p>
              </div>
              <CreditCard className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Cards</p>
                <p className="text-2xl font-bold text-green-600">{stats.cards.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verifications</p>
                <p className="text-2xl font-bold text-blue-600">{stats.verification.total}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Cards</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.cards.pending}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Card</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-4">
          <div>
            <Label htmlFor="memberId">Member ID</Label>
            <Input
              id="memberId"
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              placeholder="Enter member ID"
            />
          </div>
          <div>
            <Label>Card Type</Label>
            <Select value={newCardType} onValueChange={(value: 'digital' | 'physical' | 'both') => setNewCardType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="digital">Digital</SelectItem>
                <SelectItem value="physical">Physical</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleGenerateCard} disabled={generateCardMutation.isPending} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="cards" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="batches">Production</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-4">
                <CardTitle>Persisted Card Records</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Select value={cardStatusFilter} onValueChange={setCardStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={cardTypeFilter} onValueChange={setCardTypeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="physical">Physical</SelectItem>
                      <SelectItem value="digital">Digital</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search cards..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-56"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Card ID</TableHead>
                    <TableHead>Member ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCards.slice(0, 20).map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="font-mono">#{card.id}</TableCell>
                      <TableCell>#{card.memberId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {card.cardType === 'digital' && <Smartphone className="w-4 h-4" />}
                          {card.cardType === 'physical' && <CreditCard className="w-4 h-4" />}
                          {card.cardType === 'both' && <div className="flex"><Smartphone className="w-3 h-3" /><CreditCard className="w-3 h-3" /></div>}
                          {card.cardType}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(card.status)}>
                          {card.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{card.templateType || '-'}</TableCell>
                      <TableCell>{card.createdAt ? new Date(card.createdAt).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{card.lastUsedAt ? new Date(card.lastUsedAt).toLocaleDateString() : 'Never'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" disabled>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {card.status !== 'active' ? (
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(card, 'active')}
                              disabled={updateCardStatusMutation.isPending}
                            >
                              Activate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(card, 'inactive')}
                              disabled={updateCardStatusMutation.isPending}
                            >
                              Deactivate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Card Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-medium">{template.templateName}</h3>
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div><strong>Type:</strong> {template.templateType}</div>
                        <div><strong>Company:</strong> {template.companyId ? `#${template.companyId}` : 'Global'}</div>
                        <div><strong>Created:</strong> {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : '-'}</div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" disabled>
                          <Edit className="w-4 h-4" />
                        </Button>
                        {template.isDefault && <Badge variant="outline">Default</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Production Batches</CardTitle>
                <Select value={batchStatusFilter} onValueChange={setBatchStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_production">In Production</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Cards</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Tracking</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.batchName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getBatchStatusIcon(batch.productionStatus)}
                          {batch.batchType}
                        </div>
                      </TableCell>
                      <TableCell>{batch.processedCards}/{batch.totalCards}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(batch.productionStatus)}>
                          {batch.productionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{batch.createdAt ? new Date(batch.createdAt).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{batch.trackingNumber || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Card Type Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Digital Cards
                  </div>
                  <span className="font-medium">{stats.cards.digital}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Physical Cards
                  </div>
                  <span className="font-medium">{stats.cards.physical}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Verification Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Total Verifications</span>
                  <span className="font-medium">{stats.verification.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Successful</span>
                  <span className="font-medium text-green-600">{stats.verification.successful}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Failed</span>
                  <span className="font-medium text-red-600">{stats.verification.failed}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Verification Events</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Card ID</TableHead>
                    <TableHead>Verifier</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentVerifications.map((verification) => (
                    <TableRow key={verification.id}>
                      <TableCell>
                        {verification.verificationTimestamp
                          ? new Date(verification.verificationTimestamp).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell>#{verification.cardId}</TableCell>
                      <TableCell>{verification.verifierId ?? '-'}</TableCell>
                      <TableCell>{verification.verificationMethod}</TableCell>
                      <TableCell>
                        <Badge variant={verification.verificationResult === 'success' ? "default" : "destructive"}>
                          {verification.verificationResult}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CardManagementDashboard;
