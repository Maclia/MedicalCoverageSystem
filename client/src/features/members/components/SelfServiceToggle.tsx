import React from 'react';
import {
  Box,
  Switch,
  FormControlLabel,
  Typography,
  Stack,
  Alert,
  Chip
} from '@mui/material';

export interface SelfServiceToggleProps {
  featureId: string;
  featureName: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  description?: string;
  accessLevel?: 'BASIC' | 'STANDARD' | 'FULL';
  warningMessage?: string;
  disabled?: boolean;
}

export const SelfServiceToggle: React.FC<SelfServiceToggleProps> = ({
  featureId,
  featureName,
  enabled,
  onToggle,
  description,
  accessLevel = 'BASIC',
  warningMessage,
  disabled = false
}) => {

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'FULL': return 'success';
      case 'STANDARD': return 'primary';
      case 'BASIC': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box
      component="section"
      aria-label={`Toggle ${featureName} self-service feature`}
      sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, mb: 2 }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
              {featureName}
            </Typography>
            <Chip
              label={accessLevel}
              size="small"
              color={getAccessLevelColor(accessLevel) as any}
              variant="outlined"
            />
          </Stack>

          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {description}
            </Typography>
          )}
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
              disabled={disabled}
              slotProps={{
                input: {
                  'aria-label': `Toggle ${featureName}`,
                  id: `toggle-${featureId}`,
                  role: 'switch',
                  'aria-checked': enabled
                }
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggle(!enabled);
                }
              }}
            />
          }
          label={enabled ? 'Enabled' : 'Disabled'}
          labelPlacement="bottom"
        />
      </Stack>

      {enabled && warningMessage && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {warningMessage}
        </Alert>
      )}
    </Box>
  );
};

export default SelfServiceToggle;