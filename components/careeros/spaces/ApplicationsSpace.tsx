import React from 'react';
import type { CareerRoute } from '../../NavigationProvider';
import { ApplicationList } from '../application/ApplicationList';
import { ApplicationWorkspace } from '../application/ApplicationWorkspace';

/**
 * Applications space (COS-012/COS-016/COS-022/COS-024/COS-025): every
 * application at /app/applications and one workspace at
 * /app/applications/:id/:section.
 */
export interface SpaceProps {
    route: CareerRoute;
}

const ApplicationsSpace: React.FC<SpaceProps> = ({ route }) => (
    route.id ? <ApplicationWorkspace key={route.id} id={route.id} route={route} /> : <ApplicationList />
);

export default ApplicationsSpace;
