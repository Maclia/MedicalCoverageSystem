import React, { useState, useEffect } from 'react';
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
  const [alerts, setAlerts] = useState<UtilizationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      // API integration will be added here
      const mockAlerts: UtilizationAlert[] = [
        {
          schemeId: 1,
          schemeName: 'Corporate Health Plan 2026',
          utilizationPercentage: 78,
          threshold: 70,
          severity: 'info',
          alertName: 'WARNING',
          triggeredAt: new Date(),
          autoEscalate: false
        },
        {
          schemeId: 3,
          schemeName: 'Employee Wellness Program',
          utilizationPercentage: 89,
          threshold: 85,
          severity: 'warning',
          alertName: 'ALERT',
          triggeredAt: new Date(),
          autoEscalate: true
        },
        {
          schemeId: 5,
          schemeName: 'Executive Coverage Plan',
          utilizationPercentage: 97,
          threshold: 95,
          severity: 'error',
          alertName: 'CRITICAL',
          triggeredAt: new Date(),
          autoEscalate: true
        }
      ];
      
      setAlerts(mockAlerts);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load utilization alerts');
    } finally {
      setLoading(false);
    }
  };

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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Scheme Utilization Alerts
          </Typography>
          <Tooltip title="Refresh alerts">
            <IconButton onClick={loadAlerts} size="small">
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
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    {getSeverityIcon(alert.severity)}
                    <Typography variant="subtitle2" fontWeight="bold">
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
                  
                  <Box mb={1}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        Utilization
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
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