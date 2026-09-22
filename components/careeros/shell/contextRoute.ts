import type { CareerRoute } from '../../NavigationProvider';
import type { ContextRoute } from '../../../services/careerOs/careerContext';

/** The owned subject(s) a route names, in resolver terms. Pure; no data access. */
export function contextRouteFor(route: CareerRoute): ContextRoute {
    const out: ContextRoute = {};
    if (route.space === 'career' && route.sub === 'goals' && route.id) out.goal = route.id;
    if (route.space === 'opportunities' && route.id) out.opportunity = route.id;
    if (route.space === 'campaigns' && route.id) out.campaign = route.id;
    if (route.space === 'applications' && route.id) out.application = route.id;
    if (route.space === 'library' && route.sub === 'cvs' && route.id) out.document = route.id;
    if (route.space === 'coach' && route.id) out.conversation = route.id;
    return out;
}
