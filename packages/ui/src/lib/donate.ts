import {bridge} from '../platform';

const DONATE_URL='https://www.paypal.com/donate/?hosted_button_id=GHM82LRFVH3A6';

export function openDonation(){const b=bridge();if(b)void b.donate();else window.open(DONATE_URL,'_blank','noopener');}
