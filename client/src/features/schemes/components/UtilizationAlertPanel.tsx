import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  Stack,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Dangerous as DangerousIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import { insuranceApi } from '../../../services/api/insuranceApi';

interface UtilizationAlert {
  schemeId: number;
  schemeName: string;
  utilizationPercentage: number;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'success';
  alertName: string;
  triggeredAt: Date;
  autoEscalate: boolean;
}

export const UtilizationAlertPanel: React.FC = () => {
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['utilizationAlerts'],
    queryFn: async () => {
      const response = await insuranceApi.getUtilizationAlerts();
      return response.data as UtilizationAlert[];
    },
    refetchInterval: 60000, // Auto refresh every minute
    staleTime: 30000,
    gcTime: 300000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * attempt, 10000)
  });

  const alerts = data || [];
  const loading = isLoading;
  const lastUpdated = new Date(dataUpdatedAt);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'primary';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'success';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'info': return <InfoIcon color="primary" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'error': return <DangerousIcon color="error" />;
      default: return <CheckCircleIcon color="success" />;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 95) return 'error';
    if (percentage >= 85) return 'warning';
    if (percentage >= 70) return 'primary';
    return 'success';
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Scheme Utilization Alerts
          </Typography>
          <Tooltip title="Refresh alerts">
            <IconButton onClick={() => refetch()} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Typography variant="caption" color="text.secondary">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {alerts.length === 0 ? (
          <Alert severity="success">
            No active utilization alerts. All schemes are within normal thresholds.
          </Alert>
        ) : (
          <Stack spacing={2}>
            {alerts.map((alert) => (
              <Card key={alert.schemeId} variant="outlined" sx={{ bgcolor: `${getSeverityColor(alert.severity)}.05` }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {getSeverityIcon(alert.severity)}
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {alert.schemeName}
                    </Typography>
                    <Chip 
                      label={alert.alertName} 
                      size="small" 
                      color={getSeverityColor(alert.severity) as any}
                    />
                    {alert.autoEscalate && (
                      <Chip 
                        label="ESCALATED" 
                        size="small" 
                        color="error"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Utilization
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {alert.utilizationPercentage}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(alert.utilizationPercentage, 100)}
                      color={getProgressColor(alert.utilizationPercentage) as any}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    Threshold crossed: {alert.threshold}% at {alert.triggeredAt.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default UtilizationAlertPanel;