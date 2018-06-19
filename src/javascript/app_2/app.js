// import { configure }              from 'mobx';
import React                         from 'react';
import { render }                    from 'react-dom';
import { BrowserRouter as Router }   from 'react-router-dom';
import NetworkMonitor                from './base/network_monitor';
import ClientStore                   from './store/client_store';
import CommonStore                   from './store/common_store';
import { MobxProvider }              from './store/connect';
import TradeStore                    from './store/trade_store';
import UIStore                       from './store/ui_store';
import Footer                        from './components/layout/footer.jsx';
import Header                        from './components/layout/header.jsx';
import { BinaryRoutes }              from './routes';
import Client                        from '../_common/base/client_base';
import { getAll as getAllLanguages } from '../_common/language';
import { localize }                  from '../_common/localize';

// configure({ enforceActions: true }); // disabled for SmartCharts compatibility

const stores = {
    client: new ClientStore(),
    common: new CommonStore(),
    trade : new TradeStore(),
    ui    : new UIStore(),
};

const initApp = () => {
    Client.init();
    NetworkMonitor.init(stores);

    stores.trade.init();

    const app = document.getElementById('binary_app');
    if (app) {
        render(<BinaryApp />, app);
    }
};

/*
 * Retrieves basename from current url
 * 
 * @return {string} returns the basename of current url
 */
const getBasename = () => {
    const regex_string = `((${Object.keys(getAllLanguages()).join('|')})\/app\.html).*`;
    const basename = new RegExp(regex_string, 'ig').exec(window.location.pathname);

    if (basename && basename.length) {
        return basename[1];
    }

    return '/en/app.html';
};

const BinaryApp = () => (
    <Router basename={ getBasename() }>
        <MobxProvider store={stores}>
            <div>
                <div id='trading_header'>
                    <Header
                        items={[
                            { icon: 'trade',     text: localize('Trade'),     link_to: '/' },
                            { icon: 'portfolio', text: localize('Portfolio'), link_to: '/portfolio' },
                            { icon: 'statement', text: localize('Statement'), link_to: 'statement' },
                            { icon: 'cashier',   text: localize('Cashier') },
                        ]}
                    />
                </div>
                <div id='app_contents'>
                    <BinaryRoutes />
                </div>
                <footer id='trading_footer'>
                    <Footer
                        items={[
                            { icon: 'ic-statement',   text: localize('Statement'), link_to: 'statement' },
                            { icon: 'ic-chat-bubble', text: localize('Notification') },
                            { icon: 'ic-lock-open',   text: localize('Lock') },
                        ]}
                    />
                </footer>
            </div>
        </MobxProvider>
    </Router>
);

export default initApp;