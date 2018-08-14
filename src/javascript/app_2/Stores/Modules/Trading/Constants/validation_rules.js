const validation_rules = {
    amount: [
        ['req', {message: 'The amount is a required field.'}],
        ['number',{min: 0, type: 'float'}],
    ],
    barrier_1: [
        'barrier',
    ],
    barrier_2: [
        'barrier',
    ],
    duration: [
        ['req', {message: 'The duration is a required field.'}],
    ],
};

export default validation_rules;