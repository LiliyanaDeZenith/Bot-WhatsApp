module.exports = (add, send, api) => {
  const isVideo = u => /\.(mp4|mov|webm)(\?|$)/i.test(u);
  add('Media', 'ytmp3 yt', 'link', '', async c => {
    const r = await api.yt(c.args[0] || '');
    return send(c, { audio: { url: r.link }, mimetype: 'audio/mpeg' });
  });
  add('Media', 'ytmp4', 'link', '', async c => {
    const u = await api.media(c.args[0] || '');
    if (!isVideo(u)) throw Error('video tidak ditemukan, coba !ytmp3');
    return send(c, { video: { url: u }, caption: 'YouTube' });
  });
  add('Media', 'ig', 'link', '', async c => {
    const u = await api.media(c.args[0] || '');
    return send(c, isVideo(u) ? { video: { url: u } } : { image: { url: u } });
  });
};
