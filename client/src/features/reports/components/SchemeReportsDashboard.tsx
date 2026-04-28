import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert
} from '@mui/material';

interface SchemeReportMetric {
  label: string;
  value: number;
  change: number;
  unit?: string;
}

interface SchemeSummary {
  id: number;
  name: string;
  memberCount: number;
  utilization: number;
  status: 'ACTIVE' | 'RENEWING' | 'EXPIRED';
  premiumCollected: number;
}

export const SchemeReportsDashboard: React.FC = () => {
  const [period, setPeriod] = useState<string>('30d');
  const [activeTab, setActiveTab] = useState<number>(0);

  const metrics: SchemeReportMetric[] = [
    { label: 'Active Schemes', value: 47, change: 8 },
    { label: 'Total Members', value: 12847, change: 12 },
    { label: 'Total Premium', value: 2.4, change: -3, unit: 'M' },
    { label: 'Avg Utilization', value: 68, change: 2, unit: '%' }
  ];

  const schemeData: SchemeSummary[] = [
    { id: 1, name: 'Corporate Health Plan 2026', memberCount: 3250, utilization: 78, status: 'ACTIVE', premiumCollected: 482000 },
    { id: 2, name: 'Small Business Standard', memberCount: 2140, utilization: 62, status: 'ACTIVE', premiumCollected: 317000 },
    { id: 3, name: 'Executive Coverage', memberCount: 187, utilization: 91, status: 'RENEWING', premiumCollected: 224000 },
    { id: 4, name: 'Family Wellness Program', memberCount: 5210, utilization: 54, status: 'ACTIVE', premiumCollected: 615000 },
    { id: 5, name: 'Senior Citizens Plan', memberCount: 2060, utilization: 82, status: 'ACTIVE', premiumCollected: 372000 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'RENEWING': return 'warning';
      case 'EXPIRED': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">
          Scheme Reports Dashboard
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="period-label">Period</InputLabel>
          <Select
            labelId="period-label"
            value={period}
            label="Period"
            onChange={(e) => setPeriod(e.target.value)}
          >
            <MenuItem value="7d">Last 7 days</MenuItem>
            <MenuItem value="30d">Last 30 days</MenuItem>
            <MenuItem value="90d">Last 90 days</MenuItem>
            <MenuItem value="1y">Last year</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {metrics.map((metric, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {metric.label}
                </Typography>
                <Stack direction="row" sx={{ alignItems: 'baseline' }} spacing={1}>
                  <Typography variant="h4">
                    {metric.value}{metric.unit}
                  </Typography>
                  <Chip
                    label={`${metric.change > 0 ? '+' : ''}${metric.change}%`}
                    size="small"
                    color={metric.change >= 0 ? 'success' : 'error'}
                    variant="outlined"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
          <Tab label="Scheme Overview" />
          <Tab label="Utilization Trends" />
          <Tab label="Premium Analysis" />
          <Tab label="Claims Statistics" />
        </Tabs>
      </Box>

      <Card>
        <CardContent>
          {activeTab === 0 && (
            <>
              <Typography variant="h6" gutterBottom>
                Scheme Performance Summary
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Scheme Name</TableCell>
                    <TableCell align="right">Members</TableCell>
                    <TableCell align="right">Utilization</TableCell>
                    <TableCell align="right">Premium</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schemeData.map((scheme) => (
                    <TableRow key={scheme.id} hover>
                      <TableCell>{scheme.name}</TableCell>
                      <TableCell align="right">{scheme.memberCount.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ minWidth: 120 }}>
                           <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption">{scheme.utilization}%</Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={scheme.utilization}
                            color={scheme.utilization > 85 ? 'error' : scheme.utilization > 70 ? 'warning' : 'primary'}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="right">${scheme.premiumCollected.toLocaleString()}</TableCell>
                      <TableCell align="center">
                        <Chip label={scheme.status} size="small" color={getStatusColor(scheme.status) as any} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          {activeTab === 1 && (
            <Alert severity="info">Utilization trend charts will be rendered here</Alert>
          )}

          {activeTab === 2 && (
            <Alert severity="info">Premium analysis visualizations will be rendered here</Alert>
          )}

          {activeTab === 3 && (
            <Alert severity="info">Claims statistics breakdown will be rendered here</Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SchemeReportsDashboard;