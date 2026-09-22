import React from 'react';
import type { CareerRoute } from '../../NavigationProvider';
import { OpportunityDetail } from '../opportunities/OpportunityDetail';
import { OpportunityList } from '../opportunities/OpportunityList';

/**
 * Opportunities space (COS-011/COS-020): the list views at /app/opportunities
 * (`view` query) and one opportunity at /app/opportunities/:id.
 */
export interface SpaceProps {
    route: CareerRoute;
}

const OpportunitiesSpace: React.FC<SpaceProps> = ({ route }) => (
    route.id ? <OpportunityDetail key={route.id} id={route.id} /> : <OpportunityList route={route} />
);

export default OpportunitiesSpace;
