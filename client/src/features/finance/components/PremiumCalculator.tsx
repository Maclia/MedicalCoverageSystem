import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Chip,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Alert
} from '@mui/material';

const RISK_TIERS = [
  { value: 'LOW', label: 'Low Risk', buffer: 5, color: 'success' },
  { value: 'MEDIUM', label: 'Medium Risk', buffer: 10, color: 'primary' },
  { value: 'HIGH', label: 'High Risk', buffer: 15, color: 'warning' },
  { value: 'CRITICAL', label: 'Critical Risk', buffer: 25, color: 'error' }
];

const EXCLUDED_PROCEDURES = [
  'PREVENTIVE_CARE',
  'VACCINATION',
  'SCREENING',
  'ANNUAL_CHECKUP',
  'MATERNITY_BASIC'
];

export const PremiumCalculator: React.FC = () => {
  const [basePremium, setBasePremium] = useState<number>(1000);
  const [riskTier, setRiskTier] = useState<string>('MEDIUM');
  const [claimCount, setClaimCount] = useState<number>(0);
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);

  const calculation = useMemo(() => {
    const risk = RISK_TIERS.find(r => r.value === riskTier);
    const bufferPercent = risk?.buffer || 10;
    
    let premium = basePremium;
    
    // Apply risk buffer
    premium = premium * (1 + (bufferPercent / 100));
    
    // Apply claim loading (2% per claim over 3)
    if (claimCount > 3) {
      const additionalClaims = claimCount - 3;
      premium = premium * (1 + (additionalClaims * 0.02));
    }

    // Calculate excluded procedures discount
    const excludedDiscount = selectedProcedures.length > 0 ? 
      selectedProcedures.length * 25 : 0;

    const finalPremium = Math.max(premium - excludedDiscount, basePremium * 0.5);

    return {
      basePremium,
      riskBuffer: basePremium * (bufferPercent / 100),
      claimLoading: claimCount > 3 ? (basePremium * ((claimCount - 3) * 0.02)) : 0,
      excludedDiscount,
      finalPremium: Math.round(finalPremium * 100) / 100,
      bufferPercent,
      totalLoading: bufferPercent + (claimCount > 3 ? (claimCount - 3) * 2 : 0)
    };
  }, [basePremium, riskTier, claimCount, selectedProcedures]);

  const handleProcedureToggle = (procedure: string) => {
    setSelectedProcedures(prev => 
      prev.includes(procedure) 
        ? prev.filter(p => p !== procedure)
        : [...prev, procedure]
    );
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Premium Calculator
        </Typography>

        <Stack spacing={3}>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Base Premium"
              type="number"
              value={basePremium}
              onChange={(e) => setBasePremium(Number(e.target.value))}
              fullWidth
              inputProps={{ startAdornment: '$' }}
            />

            <FormControl fullWidth>
              <InputLabel>Risk Tier</InputLabel>
              <Select
                value={riskTier}
                label="Risk Tier"
                onChange={(e) => setRiskTier(e.target.value)}
              >
                {RISK_TIERS.map(tier => (
                  <MenuItem key={tier.value} value={tier.value}>
                    {tier.label} (+{tier.buffer}%)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Box>
            <Typography variant="body2" gutterBottom>
              Previous Claims: <strong>{claimCount}</strong>
            </Typography>
            <Slider
              value={claimCount}
              onChange={(_, value) => setClaimCount(value as number)}
              min={0}
              max={10}
              marks
              step={1}
            />
            {claimCount > 3 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Additional {claimCount - 3} claim(s) will add +{(claimCount - 3) * 2}% loading
              </Alert>
            )}
          </Box>

          <Box>
            <Typography variant="body2" gutterBottom>
              Excluded Procedures (discount applies)
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              {EXCLUDED_PROCEDURES.map(proc => (
                <Chip
                  key={proc}
                  label={proc.replace('_', ' ')}
                  onClick={() => handleProcedureToggle(proc)}
                  color={selectedProcedures.includes(proc) ? 'success' : 'default'}
                  variant={selectedProcedures.includes(proc) ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Stack>
          </Box>

          <Divider />

          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>Base Premium</TableCell>
                <TableCell align="right">${calculation.basePremium.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Risk Buffer (+{calculation.bufferPercent}%)</TableCell>
                <TableCell align="right">+${calculation.riskBuffer.toFixed(2)}</TableCell>
              </TableRow>
              {calculation.claimLoading > 0 && (
                <TableRow>
                  <TableCell>Claim History Loading</TableCell>
                  <TableCell align="right">+${calculation.claimLoading.toFixed(2)}</TableCell>
                </TableRow>
              )}
              {calculation.excludedDiscount > 0 && (
                <TableRow sx={{ color: 'success.main' }}>
                  <TableCell>Excluded Procedures Discount</TableCell>
                  <TableCell align="right">-${calculation.excludedDiscount.toFixed(2)}</TableCell>
                </TableRow>
              )}
              <TableRow sx={{ fontWeight: 'bold' }}>
                <TableCell>Final Premium</TableCell>
                <TableCell align="right">
                  <Typography variant="h6">${calculation.finalPremium.toFixed(2)}</Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Alert severity="info">
            Total premium loading applied: {calculation.totalLoading}%
          </Alert>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default PremiumCalculator;