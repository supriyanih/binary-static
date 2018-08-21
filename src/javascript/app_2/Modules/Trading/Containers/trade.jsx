import PropTypes            from 'prop-types';
import React                from 'react';
import Test                 from './test.jsx';
import FormLayout           from '../Components/Form/form_layout.jsx';
import ContractDetails      from '../../Contract/Containers/contract_details.jsx';
import InfoBox              from '../../Contract/Containers/info_box.jsx';
import SmartChart           from '../../SmartChart';
import { connect }          from '../../../Stores/connect';
import { getPropertyValue } from '../../../../_common/utility';

class Trade extends React.Component {
    componentDidMount() {
        this.props.onMount();
    }

    componentWillUnmount() {
        this.props.onUnmount();
    }

    render() {
        const contract_id = getPropertyValue(this.props.purchase_info, ['buy', 'contract_id']);
        const InfoBoxComponent = this.props.is_contract_mode ?
            <InfoBox is_trade_page /> : null;

        return (
            <div id='trade_container' className='trade-container'>
                <div className='chart-container notice-msg'>
                    { this.props.symbol &&
                        <SmartChart
                            chart_id={1}
                            InfoBox={InfoBoxComponent}
                            onSymbolChange={this.props.onSymbolChange}
                            symbol={this.props.symbol}
                        />
                    }
                    <Test />
                </div>
                { contract_id ?
                    <ContractDetails contract_id={contract_id} onClickNewTrade={this.props.onClickNewTrade} />
                    :
                    <FormLayout is_mobile={this.props.is_mobile} is_trade_enabled={this.props.is_trade_enabled} />
                }
            </div>
        );
    }
}

Trade.propTypes = {
    is_contract_mode: PropTypes.bool,
    is_mobile       : PropTypes.bool,
    is_trade_enabled: PropTypes.bool,
    onClickNewTrade : PropTypes.func,
    onMount         : PropTypes.func,
    onSymbolChange  : PropTypes.func,
    onUnmount       : PropTypes.func,
    purchase_info   : PropTypes.object,
    symbol          : PropTypes.string,
};

export default connect(
    ({ modules, ui }) => ({
        is_contract_mode: modules.smart_chart.is_contract_mode,
        is_mobile       : ui.is_mobile,
        is_trade_enabled: modules.trade.is_trade_enabled,
        onClickNewTrade : modules.trade.onClickNewTrade,
        onMount         : modules.trade.onMount,
        onSymbolChange  : modules.trade.onChange,
        onUnmount       : modules.trade.onUnmount,
        purchase_info   : modules.trade.purchase_info,
        symbol          : modules.trade.symbol,
    })
)(Trade);
