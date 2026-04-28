import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Divider,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Error,
  Schedule,
  Warning,
  HourglassEmpty
} from '@mui/icons-material';

interface ValidationCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'PENDING' | 'WARNING';
  message: string;
  timestamp?: Date;
}

interface ClaimValidationStatusProps {
  claimId?: string;
  validations?: ValidationCheck[];
  overallStatus?: 'VALID' | 'INVALID' | 'PROCESSING' | 'ESCALATED';
}

export const ClaimValidationStatus: React.FC<ClaimValidationStatusProps> = ({
  claimId,
  validations = [
    { name: 'Member Eligibility', status: 'PASS', message: 'Member is active and covered' },
    { name: 'Service Date Window', status: 'PASS', message: 'Within valid coverage period' },
    { name: 'Pre-Authorization Check', status: 'PENDING', message: 'Awaiting approval confirmation' },
    { name: 'Procedure Coverage', status: 'PASS', message: 'Procedure is included in scheme' },
    { name: 'Visit Limit Check', status: 'WARNING', message: '85% of monthly visits utilized' },
    { name: 'Shift Window Validation', status: 'PASS', message: 'Service within valid hours (06:00 - 22:00)' },
    { name: 'Duplicate Claim Check', status: 'PASS', message: 'No duplicate claims detected' },
    { name: 'Maximum Benefit Limit', status: 'PENDING', message: 'Calculating remaining balance' },
    { name: 'Provider Verification', status: 'PASS', message: 'Provider is registered and approved' },
  ],
  overallStatus = 'PROCESSING'
}) => {

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'success';
      case 'FAIL': return 'error';
      case 'WARNING': return 'warning';
      case 'PENDING': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS': return <CheckCircle color="success" fontSize="small" />;
      case 'FAIL': return <Cancel color="error" fontSize="small" />;
      case 'WARNING': return <Warning color="warning" fontSize="small" />;
      case 'PENDING': return <HourglassEmpty color="info" fontSize="small" />;
      default: return <Schedule fontSize="small" />;
    }
  };

  const completedCount = validations.filter(v => v.status === 'PASS' || v.status === 'FAIL' || v.status === 'WARNING').length;
  const progressPercentage = (completedCount / validations.length) * 100;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Claim Validation Status
          </Typography>
          <Chip 
            label={overallStatus} 
            color={getStatusColor(overallStatus) as any}
            size="small"
          />
        </Box>

        {claimId && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Claim ID: {claimId}
          </Typography>
        )}

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">Validation Progress</Typography>
            <Typography variant="body2">{completedCount} / {validations.length}</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progressPercentage} 
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <List disablePadding dense>
          {validations.map((check, index) => (
            <ListItem key={index} disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getStatusIcon(check.status)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: check.status === 'PENDING' ? 500 : 400 }}>
                      {check.name}
                    </Typography>
                    <Chip 
                      label={check.status} 
                      color={getStatusColor(check.status) as any}
                      size="small"
                      variant="outlined"
                      sx={{ height: 16, fontSize: '0.6rem' }}
                    />
                  </Box>
                }
                secondary={check.message}
              />
            </ListItem>
          ))}
        </List>

        {overallStatus === 'ESCALATED' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            This claim has been escalated for manual review
          </Alert>
        )}

        {overallStatus === 'INVALID' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Claim validation failed. See failed checks above.
          </Alert>
        )}

        {overallStatus === 'VALID' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            All validation checks passed. Claim is ready for adjudication.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ClaimValidationStatus;