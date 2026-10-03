const DONATE_URL='https://www.paypal.com/donate/?hosted_button_id=GHM82LRFVH3A6';

export function openDonation(){if(window.input)void window.input.donate();else window.open(DONATE_URL,'_blank','noopener');}
