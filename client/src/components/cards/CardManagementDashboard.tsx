import React, { useState, useEffect } from 'react';
import { MemberCard, CardTemplate, CardProductionBatch, CardVerificationEvent } from '@shared/schema';
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
import {
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Package,
  CreditCard,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  Activity
} from 'lucide-react';

interface CardManagementDashboardProps {
  className?: string;
}

interface DashboardStats {
  totalCards: number;
  activeCards: number;
  pendingCards: number;
  digitalCards: number;
  physicalCards: number;
  verificationsToday: number;
  recentVerifications: number;
}

export const CardManagementDashboard: React.FC<CardManagementDashboardProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalCards: 0,
    activeCards: 0,
    pendingCards: 0,
    digitalCards: 0,
    physicalCards: 0,
    verificationsToday: 0,
    recentVerifications: 0
  });

  const [cards, setCards] = useState<MemberCard[]>([]);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [batches, setBatches] = useState<CardProductionBatch[]>([]);
  const [verifications, setVerifications] = useState<CardVerificationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [cardStatusFilter, setCardStatusFilter] = useState<string>('all');
  const [cardTypeFilter, setCardTypeFilter] = useState<string>('all');
  const [batchStatusFilter, setBatchStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all data in parallel
      const [cardsRes, templatesRes, batchesRes, verificationsRes, statsRes] = await Promise.all([
        fetch('/api/cards'),
        fetch('/api/cards/templates'),
        fetch('/api/cards/batches'),
        fetch('/api/cards/verifications'),
        fetch('/api/cards/analytics/usage')
      ]);

      const cardsData = await cardsRes.json();
      const templatesData = await templatesRes.json();
      const batchesData = await batchesRes.json();
      const verificationsData = await verificationsRes.json();
      const statsData = await statsRes.json();

      if (cardsData.success) setCards(cardsData.data);
      if (templatesData.success) setTemplates(templatesData.data);
      if (batchesData.success) setBatches(batchesData.data);
      if (verificationsData.success) setVerifications(verificationsData.data);

      if (statsData.success) {
        const usageStats = statsData.data;
        setStats({
          totalCards: cards.length,
          activeCards: cards.filter(c => c.cardStatus === 'active').length,
          pendingCards: cards.filter(c => c.cardStatus === 'pending').length,
          digitalCards: cards.filter(c => c.cardType === 'digital').length,
          physicalCards: cards.filter(c => c.cardType === 'physical').length,
          verificationsToday: usageStats.successfulVerifications || 0,
          recentVerifications: usageStats.totalVerifications || 0
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCards = () => {
    let filtered = cards;

    if (cardStatusFilter !== 'all') {
      filtered = filtered.filter(card => card.cardStatus === cardStatusFilter);
    }

    if (cardTypeFilter !== 'all') {
      filtered = filtered.filter(card => card.cardType === cardTypeFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(card =>
        card.id.toString().includes(searchTerm) ||
        card.memberId.toString().includes(searchTerm)
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getFilteredBatches = () => {
    let filtered = batches;

    if (batchStatusFilter !== 'all') {
      filtered = filtered.filter(batch => batch.batchStatus === batchStatusFilter);
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBatchStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Package className="w-4 h-4" />;
      case 'in_production': return <RefreshCw className="w-4 h-4" />;
      case 'shipped': return <Package className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const generateCard = async (memberId: number, cardType: 'physical' | 'digital' | 'both') => {
    try {
      const response = await fetch('/api/cards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, cardType })
      });

      const result = await response.json();
      if (result.success) {
        alert('Card generated successfully!');
        loadDashboardData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error generating card:', error);
      alert('Failed to generate card: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const updateCardStatus = async (cardId: number, status: string, reason?: string) => {
    try {
      const response = await fetch(`/api/cards/${cardId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason })
      });

      const result = await response.json();
      if (result.success) {
        alert('Card status updated successfully!');
        loadDashboardData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating card status:', error);
      alert('Failed to update card status: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Card Management</h1>
          <p className="text-gray-600">Manage insurance cards, templates, and production batches</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadDashboardData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Generate Card
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cards</p>
                <p className="text-2xl font-bold">{stats.totalCards}</p>
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
                <p className="text-2xl font-bold text-green-600">{stats.activeCards}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verifications Today</p>
                <p className="text-2xl font-bold text-blue-600">{stats.verificationsToday}</p>
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
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingCards}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="cards" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="batches">Production</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Cards Tab */}
        <TabsContent value="cards" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Insurance Cards</CardTitle>
                <div className="flex gap-2">
                  <div className="flex gap-2">
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
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search cards..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-48"
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
                  {getFilteredCards().slice(0, 10).map((card) => (
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
                        <Badge className={getStatusColor(card.cardStatus)}>
                          {card.cardStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>#{card.templateId}</TableCell>
                      <TableCell>{new Date(card.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {card.lastUsedAt ? new Date(card.lastUsedAt).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {card.cardStatus !== 'active' && (
                            <Button
                              size="sm"
                              onClick={() => updateCardStatus(card.id, 'active')}
                            >
                              Activate
                            </Button>
                          )}
                          {card.cardStatus === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCardStatus(card.id, 'inactive')}
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
              {getFilteredCards().length > 10 && (
                <div className="text-center py-4 text-sm text-gray-600">
                  Showing 10 of {getFilteredCards().length} cards
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Card Templates</CardTitle>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </div>
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
                        <div><strong>Company:</strong> #{template.companyId}</div>
                        <div><strong>Created:</strong> {new Date(template.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4" />
                        </Button>
                        {!template.isActive && (
                          <Button size="sm">Activate</Button>
                        )}
                        {template.isActive && (
                          <Button size="sm" variant="outline">Deactivate</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Production Batches Tab */}
        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Production Batches</CardTitle>
                <div className="flex gap-2">
                  <Select value={batchStatusFilter} onValueChange={setBatchStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_production">In Production</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Batch
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredBatches().map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.batchName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getBatchStatusIcon(batch.batchStatus)}
                          {batch.batchType}
                        </div>
                      </TableCell>
                      <TableCell>{batch.productionQuantity}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(batch.batchStatus)}>
                          {batch.batchStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(batch.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {batch.trackingNumber || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Card Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Digital Cards
                    </div>
                    <span className="font-medium">{stats.digitalCards}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Physical Cards
                    </div>
                    <span className="font-medium">{stats.physicalCards}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Verifications Today</span>
                    <span className="font-medium text-blue-600">{stats.verificationsToday}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Recent Verifications</span>
                    <span className="font-medium">{stats.recentVerifications}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Pending Cards</span>
                    <span className="font-medium text-yellow-600">{stats.pendingCards}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Verifications</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Card ID</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifications.slice(0, 10).map((verification) => (
                    <TableRow key={verification.id}>
                      <TableCell>{new Date(verification.verifiedAt).toLocaleString()}</TableCell>
                      <TableCell>#{verification.cardId}</TableCell>
                      <TableCell>{verification.verifiedBy}</TableCell>
                      <TableCell>{verification.verificationType}</TableCell>
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