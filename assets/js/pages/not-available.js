/* Top-nav areas that are not part of this prototype yet (Timeline, Monitoring & Report): one clear page, one way out. */
(function(){const m=UI.q('m','Timeline');
SHELL.mount({module:m==='Timeline'?'timeline':m==='Planning'?'planning':'monitor',title:m});
C.$('#content').innerHTML='<div class="panel"><div class="empty">'+UI.ic('info','s24')+'<b>'+UI.esc(m)+' is not available yet</b><div class="row gap2"><a class="btn primary" href="'+SHELL.firstAllowed()+'">Open my workspace</a><a class="btn" href="'+SHELL.topHref('master')+'">Open Master Data</a></div></div></div>';})();
