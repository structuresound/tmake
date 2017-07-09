import * as React from "react";
import { Provider } from 'react-redux';


import { Route, Switch } from "react-router-dom";
import { ConnectedRouter } from 'react-router-redux';

import { settings } from '../lib'

import { ScrollToTop } from './lib/components/scroll';
import { createPage } from './containers/page';
import { Page as About } from './pages/about';
import { Page as Contact } from './pages/contact';
import { Page as Privacy } from './pages/privacy';
import { Page as Tos } from './pages/tos';
import { Home } from './pages/home';
import { Playground } from './pages/playground';
import { NotFound } from './pages/notFound';

export function routes() {
	return {
		about: About,
		contact: Contact,
		tos: Tos,
		privacy: Privacy,
		playground: Playground,
	}
}

function route(Component: any, additionalProps: any): any {
	return function component(props: any) {
		return <Component {...{ ...props, ...additionalProps }} />
	}
}

function bounceToServerRouter(props: any): any {
	// console.log('redirect', props);
	(window as any).location = props.location.pathname
	return <div />
}

export function createApp(history: any): any {
	const Page = createPage(settings);

	return function App(upstream: any) {
		const props = { ...upstream };
		return (
			<Page>
				<ConnectedRouter history={history}>
					<ScrollToTop>
						<Switch>
							<Route exact path="/" component={route(Home, props)} />

							<Route path="/about" component={route(About, props)} />
							<Route path="/contact" component={route(Contact, props)} />
							<Route path="/tos" component={route(Tos, props)} />
							<Route path="/privacy" component={route(Privacy, props)} />

							<Route exact path="/moss" component={route(Playground, props)} />
							<Route path="/moss/playground" component={route(Playground, props)} />

							<Route path="/account" component={bounceToServerRouter} />
							<Route path="/offerings" component={bounceToServerRouter} />
							<Route path="/admin" component={bounceToServerRouter} />
							<Route path="/login" component={bounceToServerRouter} />
							<Route path="/join" component={bounceToServerRouter} />

							<Route path="*" component={route(NotFound, props)} />
						</Switch>
					</ScrollToTop>
				</ConnectedRouter>
			</Page>
		)
	}
}
