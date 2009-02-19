$.gadgeteer = function(callback, options) {
  // If called with callback, notify it if we're ready
  if ($.isFunction(callback)) {
    if ($.gadgeteer.options) {
      return false;
    } else {
      $.gadgeteer.options = options = options || {};
    }
    $.gadgeteer.defaultTarget = options.defaultTarget || '#page';
    $.gadgeteer.host = options.host || '';

    // Setup link behaviours
    $.gadgeteer.linkBehaviours = options.linkBehaviours || {};
    if (!options.noAjaxLinks) {
      $('a').livequery('click', function(e) {
        $.gadgeteer.handleLinkBehaviour.call($(this), e);
      }).removeAttr('onclick');
    }

    if (!options.noAjaxForms) {
      // All forms will submit through an ajax call
      $('form').livequery('submit', function(e) {
        e.preventDefault();
        var form = $(this);
        var action = form.attr('action');
        var target = form.hasClass('silent') ? null : $.gadgeteer.defaultTarget;
        $.ajax({
          url: action.charAt(0) == '/' ? $.gadgeteer.host + action : action,
          type: form.attr('method') || 'GET',
          data: [$.param(form.formToArray()), $.param($.gadgeteer.viewer.osParams()), $.param($.gadgeteer.owner.osParams())].join("&"),
          dataType: 'html',
          auth: 'SIGNED',
          target: target
        });
      });
    }

    // Setup ajax event callbacks
    $(document).ajaxSend(function(e, request, settings) {
      if (settings.target) {
        // TODO: make this customizable by `loading` callback in options
        $(settings.target).append($.gadgeteer.loadingElem());
      }
    }).ajaxSuccess(function(e, request, settings) {
      $.gadgeteer.currentUrl = request.url;
      if (settings.target) {
        var html = request.responseText;
        $(settings.target).html(html);
      }
      // !iframe
      $(window).adjustHeight();
      // Do another adjustHeight in 250ms just to be sure
      setTimeout(function() {$(window).adjustHeight();}, 250);
    }).ajaxError(function(e, request, settings, exception) {
      console.log(request, settings, exception);
      if (settings.target) {
        var html = request.responseText;
        $(settings.target).html(html);
      }
      // !iframe
      $(window).adjustHeight();
      // Do another adjustHeight in 250ms just to be sure
      setTimeout(function() {$(window).adjustHeight();}, 250);
    }).ajaxComplete(function(e, request, settings) {
      if (request.status.toString().charAt(0) == '3') {
        var href = request.getResponseHeader('Location') || request.getResponseHeader('location');
        // hackish way to determine if we have an array (depends on the fact that the real href must be longer than 1 char)
        if (!href.charAt) href = href[0];
        $.ajax({
          url: href.charAt(0) == '/' ? $.gadgeteer.host + href : href,
          type: 'GET',
          data: $.param($.gadgeteer.viewer.osParams()) + '&' + $.param($.gadgeteer.owner.osParams()),
          dataType: 'html',
          auth: settings.auth,
          target: settings.target
        });
      }
    });

    // Wait for everything to load then call the callback
    setTimeout(function() {
      if ($.gadgeteer.viewer && $.gadgeteer.owner) {
        // Navigate away if params tell so
        var navTo = gadgets.views.getParams().navigateTo;
        if (navTo) {
          $.gadgeteer.simpleRequest(navTo);
        } else {
          callback();
        }
      } else {
        setTimeout(arguments.callee, 50);
      }
    }, 50);

  } else { // if called with no arguments it means we're initializing
    // Get information about the viewer and owner
    $.getData('/people/@viewer/@self', function(data, status) {
      $.gadgeteer.viewer = data[0];
      $.gadgeteer.viewer.osParams = function() {return $.gadgeteer._osParams.call($.gadgeteer.viewer, 'viewer')};
    });
    $.getData('/people/@owner/@self', function(data, status) {
      $.gadgeteer.owner = data[0];
      $.gadgeteer.owner.osParams = function() {return $.gadgeteer._osParams.call($.gadgeteer.owner, 'owner')};
    });
  }
}

$.extend($.gadgeteer, {
  _osParams: function(name) {
    var params = {};
    for (var attr in this) {
      if (!$.isFunction(this[attr])) {
        var underscore = attr.replace(/([A-Z])/, '_$1').toLowerCase();
        params['os_'+name+'_'+underscore] = this[attr];
      }
    }
    return params;
  },

  loadingElem: function() {
    if ($.gadgeteer.LOADING_ELEM) return $.gadgeteer.LOADING_ELEM;

    // TODO: make this customizable
    var loading = $('#loading');
    if (loading.length < 1) {
      loading = $('<div id="loading">Az oldal tölt <span class="ellipses">…</span></div>');
    }
    return $.gadgeteer.LOADING_ELEM = loading;
  },

  simpleRequest: function(href, signed) {
    var params = {}
    if (href.indexOf('os_viewer_id') == -1) params.os_viewer_id = $.gadgeteer.viewer.id;
    if (href.indexOf('os_owner_id') == -1) params.os_owner_id = $.gadgeteer.owner.id;
    if (signed) {
      params = $.extend(false, params, $.gadgeteer.viewer.osParams(), $.gadgeteer.owner.osParams());
    }
    $.ajax({
      type: 'GET',
      data: $.param(params),
      url: href.charAt(0) == '/' ? $.gadgeteer.host + href : href,
      dataType: 'html',
      auth: signed && 'SIGNED',
      target: $($.gadgeteer.defaultTarget)
    });
  },

  regularRequest: function(e) {
    // regular request (i.e. normal anchor click through) is a no-op
  },

  ajaxRequest: function(e) {
    e.preventDefault();
    var host = document.location.host;
    var link = $(this);
    var href = link.attr('href');
    var _href = link[0].getAttribute('href');

    //hack for IE href attr bug
    if (_href.match(host)) {
      var l = _href.search(host)+host.length;
      href = _href.substring(l);
    }

    if (href.charAt(0) == '/') href = $.gadgeteer.host + href;

    var params = {};
    var method = link.hasClass('post') ? 'post' : link.hasClass('put') ? 'put' : link.hasClass('delete') ? 'delete' : 'get';
    if (method != 'get') params._method = method;
    if (link.hasClass('signed'))
      params = $.extend(false, params, $.gadgeteer.viewer.osParams(), $.gadgeteer.owner.osParams());
    else
      params = $.extend(false, params, {os_viewer_id: $.gadgeteer.viewer.id, os_owner_id: $.gadgeteer.owner.id});

    var target = link.hasClass('silent') ? null : $.gadgeteer.defaultTarget;
    $.ajax({
      type: method == 'get' ? 'GET' : 'POST',
      url: href,
      data: params,
      dataType: target ? 'html' : null,
      auth: link.hasClass('signed') ? 'SIGNED' : null,
      target: target
    });
  },

  navigateRequest: function(view, params, ownerId, e) {
    e.preventDefault();
    view = gadgets.views.getSupportedViews()[view];
    gadgets.views.requestNavigateTo(view, params, ownerId); 
  },

  handleLinkBehaviour: function(e) {
    var link = $(this);
    var matched = false;
    $.each($.gadgeteer.linkBehaviours, function(behaviour, callback) {
      var match;
      if ($.isFunction(callback) && (match = callback.call(link, e))) {
        var params = match === true ? [] : ($.isFunction(match.push) ? match : Array(match));
        params.push(e);
        //console.log('calling ', behaviour, ' link behaviour for ', link, ' with ', params);
        var handler = behaviour+'Request';
        handler = $.gadgeteer.linkBehaviours.handlers && $.gadgeteer.linkBehaviours.handlers[handler] || $.gadgeteer[handler];
        handler.apply(link, params);
        matched = true;
        return false;
      }
    });
    if (!matched) {
     var def = $.gadgeteer.linkBehaviours.defaultBehavior || 'ajax';
     //console.log('calling DEFAULT ', def, ' link behaviour for ', link, ' with ', e);
     $.gadgeteer[def+'Request'].call(link, e);
    }
  }

});


// Initialize gadgeteer
$($.gadgeteer);
