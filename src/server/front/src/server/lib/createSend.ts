import { post } from '../../lib/fetch';
import { settings } from '../../lib/settings';

const apiRoot = 'https://api.createsend.com/api/v3.1';

// curl --user 0d135f8fb4d87126396b437ecaf31783:x https://api.createsend.com/api/v3.1/clients.json?pretty=true
// curl --user 0d135f8fb4d87126396b437ecaf31783:x https://api.createsend.com/api/v3.1/clients/f5f45611ea9f3a6447b622671b929875/lists.json

export function subscribe(id: string, form: any) {
    const url = `${apiRoot}/subscribers/${id}.json`;
    const body = {
        "EmailAddress": form.email,
        "Name": form.name,
        "CustomFields": [
            {
                "Key": "origin",
                "Value": settings.env.absoluteUrl
            }
        ],
        "Resubscribe": true,
        "RestartSubscriptionBasedAutoresponders": true
    }
    return post({ url, body, auth: { user: settings.private.createSend.key } }).then(
        (res: any) => {
            if (res.status > 200 && res.status < 300) {
                return Promise.resolve(res);
            } else {
                return Promise.reject(new Error(res.statusText));
            }
        }
    );
}

export function integrate() {
    const listId = settings.createSend.lists.general;
    const url = `${apiRoot}/subscribers/${listId}.json`;

    return subscribe(listId, {
        name: 'Integration Test',
        email: 'integrate@chroma.fund'
    }).catch((err) => {
        throw new Error(`failed integration test on error ${err}`)
    })
}