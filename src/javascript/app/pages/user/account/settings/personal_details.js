const SelectMatcher    = require('@binary-com/binary-style').select2Matcher;
const moment           = require('moment');
const BinaryPjax       = require('../../../../base/binary_pjax');
const Client           = require('../../../../base/client');
const Header           = require('../../../../base/header');
const BinarySocket     = require('../../../../base/socket');
const formatMoney      = require('../../../../common/currency').formatMoney;
const FormManager      = require('../../../../common/form_manager');
const Geocoder         = require('../../../../../_common/geocoder');
const CommonFunctions  = require('../../../../../_common/common_functions');
const localize         = require('../../../../../_common/localize').localize;
const State            = require('../../../../../_common/storage').State;
const getPropertyValue = require('../../../../../_common/utility').getPropertyValue;

const PersonalDetails = (() => {
    const form_id           = '#frmPersonalDetails';
    const real_acc_elements = '.RealAcc';

    let is_for_new_account = false;

    let editable_fields,
        is_jp_client,
        is_virtual,
        residence,
        get_settings_data,
        currency;

    const init = () => {
        editable_fields   = {};
        get_settings_data = {};
        is_virtual        = Client.get('is_virtual');
        residence         = Client.get('residence');
        is_jp_client      = residence === 'jp'; // we need to check with residence so we know which fields will be present in get_settings response
        if (is_jp_client && !is_virtual) {
            showHideTaxMessage();
        }
    };

    const showHideTaxMessage = () => {
        const $tax_info_declaration = $('#tax_information_declaration');
        const $tax_information_info = $('#tax_information_info');

        if (Client.shouldCompleteTax()) {
            $('#tax_information_note_toggle').off('click').on('click', (e) => {
                e.stopPropagation();
                $('#tax_information_note_toggle').toggleClass('open');
                $('#tax_information_note').slideToggle();
            });
        } else {
            $tax_information_info.setVisibility(0); // hide tax info
            $tax_info_declaration.setVisibility(0); // hide tax info declaration
        }
    };

    const showHideLabel = (get_settings) => {
        if (!is_jp_client) {
            ['place_of_birth', 'account_opening_reason', 'citizen'].forEach((id) => {
                if (Object.prototype.hasOwnProperty.call(get_settings, id)) {
                    if (get_settings[id]) {
                        // we have to show text here instead of relying on displayGetSettingsData()
                        // since it prioritizes showing data instead of label
                        const $label = $(`#lbl_${id}`);
                        $label.text(get_settings[id]);
                        $(`#row_${id}`).setVisibility(0);
                        $(`#row_lbl_${id}`).setVisibility(1);
                    } else {
                        $(`#row_lbl_${id}`).setVisibility(0);
                        $(`#row_${id}`).setVisibility(1);
                    }
                }
            });
        }
    };

    const showHideMissingDetails = () => {
        const validations = getValidations();
        const has_missing_field = validations.find((validation) => /req/.test(validation.validations) && $(validation.selector).val() === '');
        $('#missing_details_notice').setVisibility(!!has_missing_field);
    };

    const getDetailsResponse = (data, residence_list = State.getResponse('residence_list')) => {
        const get_settings         = $.extend({}, data);
        get_settings.date_of_birth = 'date_of_birth' in get_settings ? moment.utc(new Date(get_settings.date_of_birth * 1000)).format('YYYY-MM-DD') : '';
        const accounts             = Client.getAllLoginids();
        // for subaccounts, back-end sends loginid of the master account as name
        const hide_name            = accounts.some(loginid => new RegExp(loginid, 'i').test(get_settings.first_name)) || is_virtual;
        if (!hide_name) {
            get_settings.name = is_jp_client ? get_settings.last_name : `${(get_settings.salutation || '')} ${(get_settings.first_name || '')} ${(get_settings.last_name || '')}`;
        }

        if (get_settings.place_of_birth) {
            get_settings.place_of_birth =
                (residence_list.find(obj => obj.value === get_settings.place_of_birth) || {}).text ||
                get_settings.place_of_birth;
        }

        if (get_settings.citizen) {
            get_settings.citizen =
                (residence_list.find(obj => obj.value === get_settings.citizen) || {}).text ||
                get_settings.citizen;
        }

        showHideLabel(get_settings);

        displayGetSettingsData(get_settings);

        if (is_virtual) {
            $(real_acc_elements).remove();
        } else if (is_jp_client) {
            const jp_settings = get_settings.jp_settings;
            switch (jp_settings.gender) {
                case 'f':
                    jp_settings.gender = localize('Female');
                    break;
                case 'm':
                    jp_settings.gender = localize('Male');
                    break;
                default:
                    break;
            }
            displayGetSettingsData(jp_settings);
            if (jp_settings.hedge_asset !== null && jp_settings.hedge_asset_amount !== null) {
                $('.hedge').setVisibility(1);
            }
            $('.JpAcc').setVisibility(1);
        } else {
            $(real_acc_elements).setVisibility(1);
            showHideTaxMessage();
        }
        $(form_id).setVisibility(1);
        $('#loading').remove();
        FormManager.init(form_id, getValidations());
        FormManager.handleSubmit({
            form_selector       : form_id,
            obj_request         : { set_settings: 1 },
            fnc_response_handler: setDetailsResponse,
            fnc_additional_check: additionalCheck,
            enable_button       : true,
        });
        if (!is_virtual && !is_jp_client) {
            Geocoder.validate(form_id);
        }
        showHideMissingDetails();
    };

    const displayGetSettingsData = (data, populate = true) => {
        let el_key,
            el_lbl_key,
            data_key;
        Object.keys(data).forEach((key) => {
            el_key     = document.getElementById(key);
            el_lbl_key = document.getElementById(`lbl_${key}`);
            // prioritise labels for japan account
            el_key = is_jp_client ? (el_lbl_key || el_key) : (el_key || el_lbl_key);
            if (el_key) {
                data_key             = /format_money/.test(el_key.className) && data[key] !== null ? formatMoney(currency, data[key]) : (data[key] || '');
                editable_fields[key] = data_key;
                if (populate) {
                    if (el_key.type === 'checkbox') {
                        el_key.checked = !!data_key;
                    } else if (/select|text/i.test(el_key.type)) {
                        $(el_key)
                            .val(data_key.split(','))
                            .trigger('change');
                    } else if (key !== 'country') {
                        CommonFunctions.elementInnerHtml(el_key, data_key ? localize(data_key) : '-');
                    }
                }
            }
        });
        if (data.country) {
            $('#residence').replaceWith($('<label/>').append($('<strong/>', { id: 'lbl_country' })));
            $('#lbl_country').text(data.country);
        }
    };

    const additionalCheck = (data) => {
        if (!isChanged(data) && (!data.jp_settings || !isChanged(data.jp_settings))) {
            showFormMessage('You did not change anything.', false);
            return false;
        }
        return true;
    };

    const isChanged = (data) => {
        const compare_data = $.extend({}, data);
        return Object.keys(compare_data).some(key => (
            key !== 'set_settings' && key !== 'jp_settings' && editable_fields[key] !== compare_data[key]
        ));
    };

    const getValidations = () => {
        let validations;
        const data = get_settings_data;
        if (is_jp_client) {
            validations = [
                { request_field: 'address_line_1',   value: data.address_line_1 },
                { request_field: 'address_line_2',   value: data.address_line_2 },
                { request_field: 'address_city',     value: data.address_city },
                { request_field: 'address_state',    value: data.address_state },
                { request_field: 'address_postcode', value: data.address_postcode },
                { request_field: 'phone',            value: data.phone },

                { selector: '#email_consent' },

                { selector: '#hedge_asset_amount',       validations: ['req', 'number'], parent_node: 'jp_settings' },
                { selector: '#hedge_asset',              validations: ['req'],           parent_node: 'jp_settings' },
                { selector: '#motivation_circumstances', validations: ['req'],           parent_node: 'jp_settings' },
                { selector: '#account_opening_reason',   validations: ['req'] },

            ];
            $(form_id).find('select').each(function () {
                validations.push({ selector: `#${$(this).attr('id')}`, validations: ['req'], parent_node: 'jp_settings' });
            });
        } else if (is_virtual) {
            validations = [
                { selector: '#email_consent' },
                { selector: '#residence', validations: ['req'] },
            ];
        } else {
            const is_financial      = Client.isAccountOfType('financial');
            const is_gaming         = Client.isAccountOfType('gaming');
            const mt_acct_type      = localStorage.getItem('personal_details_redirect');
            const is_for_mt_citizen = !!mt_acct_type;                                                   // all mt account opening requires citizen
            const is_for_mt_tax     = /real/.test(mt_acct_type) && mt_acct_type.split('_').length > 2;  // demo and volatility mt accounts do not require tax info

            validations = [
                { selector: '#address_line_1',         validations: ['req', 'address'] },
                { selector: '#address_line_2',         validations: ['address'] },
                { selector: '#address_city',           validations: ['req', 'letter_symbol'] },
                { selector: '#address_state',          validations: $('#address_state').prop('nodeName') === 'SELECT' ? '' : ['letter_symbol'] },
                { selector: '#address_postcode',       validations: [Client.get('residence') === 'gb' ? 'req' : '', 'postcode', ['length', { min: 0, max: 20 }]] },
                { selector: '#email_consent' },
                { selector: '#phone',                  validations: ['req', 'phone', ['length', { min: 6, max: 35, value: () => $('#phone').val().replace(/^\+/, '')  }]] },
                { selector: '#place_of_birth',         validations: ['req'] },
                { selector: '#account_opening_reason', validations: ['req'] },

                { selector: '#tax_residence',  validations: (is_financial || is_for_mt_tax) ? ['req'] : '' },
                { selector: '#citizen',        validations: (is_financial || is_gaming || is_for_mt_citizen) ? ['req'] : '' },
                { selector: '#chk_tax_id',     validations: is_financial ? [['req', { hide_asterisk: true, message: localize('Please confirm that all the information above is true and complete.') }]] : '', exclude_request: 1 },
            ];

            const tax_id_validation  = { selector: '#tax_identification_number', validations: ['tax_id', ['length', { min: 0, max: 20 }]] };
            if (is_financial || is_for_mt_tax) {
                tax_id_validation.validations[1][1].min = 1;
                tax_id_validation.validations.unshift('req');
            }
            validations.push(tax_id_validation);
        }
        return validations;
    };

    const setDetailsResponse = (response) => {
        // allow user to resubmit the form on error.
        const is_error = response.set_settings !== 1;
        if (!is_error) {
            const redirect_url = localStorage.getItem('personal_details_redirect');
            // to update tax information message for financial clients
            BinarySocket.send({ get_account_status: 1 }, { forced: true }).then((response_status) => {
                showHideTaxMessage();
                Header.displayAccountStatus();
                if (redirect_url && +response_status.get_account_status.prompt_client_to_authenticate && Client.isAccountOfType('financial')) {
                    $('#msg_authenticate').setVisibility(1);
                }
            });
            // to update the State with latest get_settings data
            BinarySocket.send({ get_settings: 1 }, { forced: true }).then((data) => {
                if (is_virtual && response.echo_req.residence) {
                    window.location.reload(); // reload page if we are setting residence
                    return;
                }
                // update notification shown for set residence etc
                Header.displayAccountStatus();
                if (is_for_new_account) {
                    is_for_new_account = false;
                    BinaryPjax.loadPreviousUrl();
                    return;
                }
                const get_settings    = data.get_settings;
                const has_required_mt = get_settings.tax_residence && get_settings.tax_identification_number &&
                    get_settings.citizen;
                if (redirect_url && has_required_mt) {
                    localStorage.removeItem('personal_details_redirect');
                    $.scrollTo($('h1#heading'), 500, { offset: -10 });
                    $(form_id).setVisibility(0);
                    $('#missing_details_notice').setVisibility(0);
                    $('.rowCustomerSupport').setVisibility(0);
                    $('#msg_main').setVisibility(1);
                    return;
                }
                getDetailsResponse(get_settings);
            });
        }
        showFormMessage(is_error ?
            (getPropertyValue(response, ['error', 'message']) || 'Sorry, an error occurred while processing your account.') :
            'Your settings have been updated successfully.', !is_error);
    };

    const showFormMessage = (msg, is_success) => {
        $('#formMessage')
            .attr('class', is_success ? 'success-msg' : 'errorfield')
            .html(is_success ? $('<ul/>', { class: 'checked' }).append($('<li/>', { text: localize(msg) })) : localize(msg))
            .css('display', 'block')
            .delay(5000)
            .fadeOut(1000);
    };

    const populateResidence = (response) => (
        new Promise((resolve) => {
            const residence_list = response.residence_list;
            if (residence_list.length > 0) {
                const $options               = $('<div/>');
                const $options_with_disabled = $('<div/>');
                residence_list.forEach((res) => {
                    $options.append(CommonFunctions.makeOption({ text: res.text, value: res.value }));
                    $options_with_disabled.append(CommonFunctions.makeOption({
                        text       : res.text,
                        value      : res.value,
                        is_disabled: res.disabled,
                    }));
                });

                if (residence) {
                    const $tax_residence = $('#tax_residence');
                    $tax_residence.html($options_with_disabled.html()).promise().done(() => {
                        setTimeout(() => {
                            $tax_residence.select2()
                                .val(get_settings_data.tax_residence ? get_settings_data.tax_residence.split(',') : '')
                                .trigger('change')
                                .setVisibility(1);
                        }, 500);
                    });

                    if (!get_settings_data.place_of_birth) {
                        $options.prepend($('<option/>', { value: '', text: localize('Please select') }));
                        $('#place_of_birth')
                            .html($options.html())
                            .val(residence);
                    }

                    if (!get_settings_data.citizen) {
                        $options.prepend($('<option/>', { value: '', text: localize('Please select') }));
                        $('#citizen')
                            .html($options.html())
                            .val(residence);
                    }
                } else {
                    $('#lbl_country').parent().replaceWith($('<select/>', { id: 'residence', single: 'single' }));
                    const $residence = $('#residence');
                    $options_with_disabled.prepend($('<option/>', { text: localize('Please select a country'), value: '' }));
                    $residence.html($options_with_disabled.html());
                    $residence.select2({
                        matcher(params, data) {
                            return SelectMatcher(params, data);
                        },
                    });
                }
            }
            resolve();
        })
    );

    const populateStates = (response) => (
        new Promise((resolve) => {
            const states = response.states_list;

            if (is_jp_client) {
                const state_text =
                          (states.filter(state => state.value === get_settings_data.address_state)[0] || {}).text;
                $('#lbl_address_state').text(state_text || get_settings_data.address_state);
            } else {
                const address_state = '#address_state';
                let $field          = $(address_state);

                $field.empty();

                if (states && states.length > 0) {
                    $field.append($('<option/>', { value: '', text: localize('Please select') }));
                    states.forEach((state) => {
                        $field.append($('<option/>', { value: state.value, text: state.text }));
                    });
                } else {
                    $field.replaceWith($('<input/>', { id: address_state.replace('#', ''), name: 'address_state', type: 'text', maxlength: '35', 'data-lpignore': true }));
                    $field = $(address_state);
                }
                $field.val(get_settings_data.address_state);

                if (states && states.length > 0) {
                    $('#address_state').select2({
                        matcher(params, data) {
                            return SelectMatcher(params, data);
                        },
                    });
                }
            }

            if (is_jp_client && !is_virtual) {
                // detect hedging needs to be called after FormManager.init
                // or all previously bound event listeners on form elements will be removed
                CommonFunctions.detectHedging($('#trading_purpose'), $('.hedge'));
            }
            resolve();
        })
    );

    const onLoad = () => {
        currency = Client.get('currency');
        BinarySocket.wait('get_account_status', 'get_settings').then(() => {
            init();
            get_settings_data = State.getResponse('get_settings');

            if (is_virtual) {
                getDetailsResponse(get_settings_data);
            }

            if (!is_virtual || !residence) {
                BinarySocket.send({ residence_list: 1 }).then(response => {
                    populateResidence(response).then(() => {
                        if (residence) {
                            BinarySocket.send({ states_list: residence }).then(response_state => {
                                populateStates(response_state).then(() => {
                                    getDetailsResponse(get_settings_data, response.residence_list);
                                });
                            });
                        } else {
                            getDetailsResponse(get_settings_data, response.residence_list);
                        }
                        $('#place_of_birth, #citizen').select2({
                            matcher(params, data) {
                                return SelectMatcher(params, data);
                            },
                        });
                    });
                });
            }
        });
    };

    const onUnload = () => {
        is_for_new_account = false;
        localStorage.removeItem('personal_details_redirect');
    };

    return {
        onLoad,
        onUnload,

        setIsForNewAccount: (bool) => { is_for_new_account = bool; },
    };
})();

module.exports = PersonalDetails;
