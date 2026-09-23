import React from 'react';
import type { CareerRoute } from '../../NavigationProvider';
import { CampaignDetail } from '../campaigns/CampaignDetail';
import { CampaignList } from '../campaigns/CampaignList';

/**
 * Campaigns space (COS-021): the list at /app/campaigns and one campaign's
 * board or list (`view` query) at /app/campaigns/:id.
 */
export interface SpaceProps {
    route: CareerRoute;
}

const CampaignsSpace: React.FC<SpaceProps> = ({ route }) => (
    route.id ? <CampaignDetail key={route.id} id={route.id} route={route} /> : <CampaignList />
);

export default CampaignsSpace;
