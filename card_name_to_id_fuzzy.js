import { make_card_name_to_id_fuzzy, ready } from './card_info';
import uf from '@leeoniya/ufuzzy';
const fuzzy = new uf();
const card_name_to_id_fuzzy = make_card_name_to_id_fuzzy(fuzzy);
export { card_name_to_id_fuzzy, ready};