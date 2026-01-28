import { Badge } from '@chakra-ui/react';
import EndPointsURL from '../api/EndPointsURL';

export const EnvironmentBadge = () => {
    const env = EndPointsURL.getEnvironment();

    if (env === 'production') return null;

    return (
        <Badge
            colorScheme={env === 'staging' ? 'orange' : 'blue'}
            position="fixed"
            bottom="4"
            right="4"
            zIndex={9999}
            fontSize="sm"
            px={3}
            py={1}
        >
            {env === 'staging' ? 'STAGING' : 'LOCAL DEV'}
        </Badge>
    );
};
