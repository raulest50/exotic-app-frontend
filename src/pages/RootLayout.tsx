
import {Outlet} from 'react-router-dom'
import { Flex } from '@chakra-ui/react';
import { AuthorizedAgentAssistant } from './AgentAssistant/AuthorizedAgentAssistant';
import { NewFeaturesProvider } from './NewFeaturesModule/NewFeaturesProvider';


function RootLayout(){
    return(
        <NewFeaturesProvider>
            <Flex direction={'column'}>
                <Outlet/>
                <AuthorizedAgentAssistant />
            </Flex>
        </NewFeaturesProvider>
    );
}

export default RootLayout
