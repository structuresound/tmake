export const account = (state = {}, action: TMake.Action.SetUser) => {
    switch (action.type) {
        case 'SET_USER':
            return { user: action.user };
        default:
            return state;
    }
};