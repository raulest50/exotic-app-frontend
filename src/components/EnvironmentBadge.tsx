import { Badge } from '@chakra-ui/react';
import EndPointsURL from '../api/EndPointsURL';

export const EnvironmentBadge = () => {
    const env = EndPointsURL.getEnvironment();
    let label = 'LOCAL DEV';

    // Indicador temporal durante la convivencia de Render y Google Cloud.
    if (env !== 'local') {
        const hostname = new URL(EndPointsURL.getDomain()).hostname;
        let provider: string | undefined;

        if (['lac-manufacture-backend.onrender.com', 'exotic-app-backend-staging.onrender.com'].includes(hostname)) {
            provider = 'RENDER';
        } else if (['mrp.api.prod.exotic.com.co', 'mrp.api.staging.exotic.com.co', '34.30.31.30'].includes(hostname)) {
            provider = 'GCLOUD';
        }

        const environmentLabel = env === 'production' ? 'PRODUCCION' : 'PRUEBAS';
        label = provider ? `${environmentLabel}: ${provider}` : environmentLabel;
    }

    return (
        <Badge
            colorPalette={{ local: 'blue', staging: 'orange', production: 'red' }[env]}
            variant={env === 'production' ? 'solid' : 'subtle'}
            position="fixed"
            bottom="4"
            right="4"
            zIndex={9999}
            fontSize="sm"
            maxW="calc(100vw - 2rem)"
            whiteSpace="normal"
            px={3}
            py={1}
        >
            {label}
        </Badge>
    );
};
