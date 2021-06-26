/**
 * Формирут путь к ресайзеру для данного урла картинки с параметрами
 * (i.e.)
 * http://pics.top.rbc.ru/top_pics/uniora/93/1323953962_0693.250x200.jpeg ->
 * http://pics.top.rbc.ru/top_pics/resized/200x160_crop/uniora/93/1323953962_0693.250x200.jpeg
 * http://pics.top.rbc.ru/v6_top_pics/media/img/4/64/404079963699644.jpg ->
 * http://pics.top.rbc.ru/v6_top_pics/resized/200x160_crop/media/img/4/64/404079963699644.jpg)
 * Twig usage: {{item.url | picResize(80, 80, true) }}
 * Resizes : 85x68|120x96|155x124|200x160|480x480|720x720|Wx124|16x16_crop|85x68_crop|156x117_crop|200x160_crop|250x187_crop
 * @param {string} url
 * @param {string|number} cropWidth
 * @param {string|number} cropHeight
 * @param {boolean} [crop=false]
 * @return {string} url
 */
module.exports = function(url, args) {
    if (!url) return '';
    if (!args || !args.length) return url;

    const [cropWidth = 'W', cropHeight = 'H', crop = false] = args;

    if (crop) {
        /**
         бизторг — это продажа бизнеса
         1. у них отдельный сайт
         2. на РБК есть их блок в рубрике СВОЕ ДЕЛО
         https://test.rbc.ru/own_business/11/03/2021/6049d74e490c9a00d2a7c390

         возможно, раньше в далеком забытом дизайне он был с картинками
         и таким образом в твиге появилось это условие
         но сейчас, кажется, оно и правда не нужно
         */
        /*if (url.indexOf('pics_biztorg') > 0) {
            //preg_match( '~\/upload\/obj\/(.+)$~i', $url, $picsParam );
            url = '//s.rbk.ru/resizer_pics/' + cropWidth + 'x' + cropHeight;// + '_crop/biztorg/' + picsParam[ 1 ];

        } else if (url.indexOf('biztorg_pics') > 0) {
            //preg_match( '~\/([a-z]+)\_pics\/(.+)$~i', $url, $picsParam );
            url = '//s.rbk.ru/resizer_pics/' + cropWidth + 'x' + cropHeight;// + '_crop/' + picsParam[ 1 ] + '/' + picsParam[ 2 ];*/

        if (url.includes('emitent_pics')) { // то лого из базы компаний
            url = url.replace('emitent_pics/', `emitent_pics/resized/${cropWidth}x${cropHeight}_crop/`);

        } else {
            url = url.replace('media/img', `resized/${cropWidth}x${cropHeight}_crop/media/img`);
        }

    } else {
        /*if (url.indexOf('pics_biztorg') > 0) {
            //preg_match( '~\/upload\/obj\/(.+)$~i', $url, $picsParam );
            url = '//s.rbk.ru/resizer_pics/' + cropWidth + 'x' + cropHeight + '_crop/biztorg/';// . $picsParam[ 1 ];*/

        if (url.includes('emitent_pics')) {
            url = url.replace('emitent_pics/', `emitent_pics/resized/${cropWidth}x${cropHeight}`);

        } else {
            url = url.replace('media/img', `resized/${cropWidth}x${cropHeight}/media/img`);
        }
    }

    return url;
};