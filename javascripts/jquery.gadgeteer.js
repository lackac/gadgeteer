/*! Copyright (c) 2009 László Bácsi (http://icanscale.com)
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 *
 * Version: 0.3
 * Requires opensocial-jQuery 1.0.4+
 */

(function($) {

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
      // Making sure submit input element values are submitted
      $('form input[type=submit]').livequery('click', function(e) {
        $(this).parents('form:eq(0)').data('submitClicked', $(this));
      });
      // All forms will submit through an ajax call
      $('form').livequery('submit', function(e) {
        e.preventDefault();
        var form = $(this);
        var action = form.attr('action');
        var target = form.hasClass('silent') ? null : $.gadgeteer.defaultTarget;
        var params = [$.param(form.formToArray()), $.param($.gadgeteer.viewer.osParams()), $.param($.gadgeteer.owner.osParams())];
        var submit = form.data('submitClicked');
        if (submit) {
          if (submit.attr('name')) {
            var param = {};
            param[submit.attr('name')] = submit.val();
            params.push($.param(param));
          }
          if ($.gadgeteer.options.submitSendingMessage) {
            submit.data('oldValue', submit.val());
            submit.val($.gadgeteer.options.submitSendingMessage).get(0).disabled = true;
          }
          form.data('submitClicked', null);
        }
        action = $.gadgeteer.expandUri(action);
        $.ajax({
          url: action,
          type: form.attr('method') || 'GET',
          data: params.join("&"),
          dataType: 'html',
          oauth: 'signed',
          target: target,
          complete: function(request, status) {
            if (submit) {
              var oldValue = submit.data('oldValue');
              if (oldValue) {
                submit.val(oldValue).get(0).disabled = false;
                submit.data('oldValue', null);
              }
            }
          }
        });
      });
    }

    // Setup ajax event callbacks
    $(document).ajaxSend(function(e, request, settings) {
      if (settings.target && $.gadgeteer.options.loadingMessage) {
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
      if (settings.target && request.status.toString().charAt(0) != '3') {
        var html = request.responseText;
        $(settings.target).html(html);
        // !iframe
        $(window).adjustHeight();
        // Do another adjustHeight in 250ms just to be sure
        setTimeout(function() {$(window).adjustHeight();}, 250);
      }
    }).ajaxComplete(function(e, request, settings) {
      if (request.status.toString().charAt(0) == '3') {
        var href = request.getResponseHeader('Location') || request.getResponseHeader('location');
        // hackish way to determine if we have an array (depends on the fact that the real href must be longer than 1 char)
        if (!href.charAt) href = href[0];
        href = $.gadgeteer.expandUri(href);
        var params = '';
        if (settings.auth == 'signed' || !$.gadgeteer.options.dontAddOsParams) {
          params = $.param($.gadgeteer.viewer.osParams()) + '&' + $.param($.gadgeteer.owner.osParams())
        }
        $.ajax({
          url: href,
          type: 'GET',
          data: params,
          dataType: 'html',
          oauth: settings.auth,
          target: settings.target
        });
      }
    });

    // Wait for everything to load then call the callback
    setTimeout(function() {
      if ($.gadgeteer.viewer && $.gadgeteer.owner && $.gadgeteer.data && $.gadgeteer.owner.data) {
        // Navigate away if params tell so
        var params = gadgets.views.getParams();
        var navTo = params.navigateTo;
        if (navTo) {
          // Tell the callback that we're navigating away
          callback(true);
          $.gadgeteer.simpleRequest(navTo, {signed: params.signedNavigate});
        } else {
          callback();
        }
      } else {
        setTimeout(arguments.callee, 50);
      }
    }, 50);
  }
}

$.extend($.gadgeteer, {
  loadingElem: function() {
    if ($.gadgeteer.LOADING_ELEM) return $.gadgeteer.LOADING_ELEM;

    var loading = $('#loading');
    if (loading.length < 1) {
      loading = $('<div id="loading">'+$.gadgeteer.options.loadingMessage+'</div>');
    }
    return $.gadgeteer.LOADING_ELEM = loading;
  },

  expandUri: function(uri, options) {
    if (uri.charAt(0) == '/') uri = $.gadgeteer.host + uri;
    if (!options) options = {};
    if (!$.gadgeteer.options.dontExpand) {
      if ($.gadgeteer.viewer) {
        uri = uri.replace(/(?:(\/)|{)viewer(?:}|([\/\?#]|$))/g, '$1'+$.gadgeteer.viewer.backendId+'$2');
      }
      if ($.gadgeteer.owner) {
        uri = uri.replace(/(?:(\/)|{)owner(?:}|([\/\?#]|$))/g, '$1'+$.gadgeteer.owner.backendId+'$2');
      }
    }
    if (options.addParams) {
      var params = $.param($.extend(false, $.gadgeteer.viewer.osParams(), $.gadgeteer.owner.osParams()));
      uri += (uri.indexOf('?') != -1 ? '&' : '?') + params;
    } else if (options.addProfileIds) {
      var params = {};
      if (uri.indexOf('os_viewer_id') == -1) params.os_viewer_id = $.gadgeteer.viewer.id;
      if (uri.indexOf('os_owner_id') == -1) params.os_owner_id = $.gadgeteer.owner.id;
      uri += (uri.indexOf('?') != -1 ? '&' : '?') + $.param(params);
    }
    return uri;
  },

  simpleRequest: function(href, options) {
    var params = (options.data === undefined ? {} : options.data);
    if (options === undefined) options = {};
    if (options.addProfileIds) {
      if (href.indexOf('os_viewer_id') == -1) params.os_viewer_id = $.gadgeteer.viewer.id;
      if (href.indexOf('os_owner_id') == -1) params.os_owner_id = $.gadgeteer.owner.id;
    }
    if (options.signed) {
      params = $.extend(false, params, $.gadgeteer.viewer.osParams(), $.gadgeteer.owner.osParams());
    }
    href = $.gadgeteer.expandUri(href);
    options = $.extend(
      { // defaults
        type: 'GET',
        dataType: 'html'
      }, options, { // force options
        data: $.param(params),
        url: href,
        oauth: options.signed && 'signed',
        target: options.target === undefined ? $($.gadgeteer.defaultTarget) : options.target
      }
    );
    $.ajax(options);
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

    var params = {};
    var method = link.hasClass('post') ? 'post' : link.hasClass('put') ? 'put' : link.hasClass('delete') ? 'delete' : 'get';
    if (method != 'get') params._method = method;
    if (link.hasClass('signed')) {
      params = $.extend(false, params, $.gadgeteer.viewer.osParams(), $.gadgeteer.owner.osParams());
    } else if (!$.gadgeteer.options.dontAddOsParams) {
      params = $.extend(false, params, {os_viewer_id: $.gadgeteer.viewer.id, os_owner_id: $.gadgeteer.owner.id});
    }

    var target = link.hasClass('silent') ? null : $.gadgeteer.defaultTarget;
    href = $.gadgeteer.expandUri(href);
    $.ajax({
      type: method == 'get' ? 'GET' : 'POST',
      url: href,
      data: params,
      dataType: target ? 'html' : null,
      oauth: link.hasClass('signed') ? 'signed' : null,
      target: target
    });
  },

  navigateRequest: function(view, params, ownerId, e) {
    if (e !== undefined) {
      e.preventDefault();
    }
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
  },

  appLink: function(parameters) {
    return gadgets.views.bind(gadgets.config.get('views')['canvas'].urlTemplate, {
      appId: document.location.host.match(/(\d+)\./)[1],
      viewParams: encodeURIComponent(gadgets.json.stringify(parameters))
    });
  }
});

// Initialize gadgeteer
$(function() {
  // Get information about the viewer and owner
  var osd = opensocial.data.DataContext;
  function finalizeData(person, data, fromosd) {
    for (var id in data) {
      data = data[id];
      break;
    }
    if (fromosd) {
      for (var key in data) {
        data[key] = gadgets.json.parse(data[key]);
      }
    }
    $.gadgeteer[person].data = function(key, value, cb) {
      if (value === undefined) {
        return data[key];
      } else {
        var oldValue = data[key];
        data[key] = value;
        var params = {};
        params[key] = value;
        var tries = 3;
        (function() {
          var callee = arguments.callee;
          $.ajax({
            type: 'POST', url: '/appdata/@'+person, data: params,
            dataType: 'data', success: cb,
            error: function(event, request, settings, thrownError) {
              console.warn('error requesting appdata update (try #'+(3-tries+1)+')', event, request, settings, thrownError);
              if (tries--) {
                callee();
              } else { // resetting old value
                data[key] = oldValue;
                cb(null, 'failure');
              }
            }
          });
        })();
        return value;
      }
    };
    if (person == 'viewer') {
      $.gadgeteer.data = $.gadgeteer[person].data;
    }
  }
  function finalizePerson(person) {
    $.gadgeteer[person].osParams = function() {
      var params = {};
      for (var attr in $.gadgeteer[person]) {
        if (!$.isFunction($.gadgeteer[person][attr])) {
          var underscore = attr.replace(/([A-Z])/, '_$1').toLowerCase();
          if (typeof $.gadgeteer[person][attr] == "object") {
            for (subattr in $.gadgeteer[person][attr]) {
              var subus = subattr.replace(/([A-Z])/, '_$1').toLowerCase();
              params['os_'+person+'_'+underscore+'['+subus+']'] = $.gadgeteer[person][attr][subattr];
            }
          } else {
            params['os_'+person+'_'+underscore] = $.gadgeteer[person][attr];
          }
        }
      }
      return params;
    };
    if (!$.gadgeteer.options.dontSwapDots) {
      $.gadgeteer[person].backendId = $.gadgeteer[person].id.replace(/\./g, '-');
    } else {
      $.gadgeteer[person].backendId = $.gadgeteer[person].id;
    }
    var data;
    if (osd && (data = osd.getDataSet(person+'Data'))) {
      finalizeData(person, data, true);
    } else {
      $.getData('/appdata/@'+person, function(data, status) {
        finalizeData(person, data);
      });
    }
  }
  function setupPerson(person) {
    if (osd && ($.gadgeteer[person] = osd.getDataSet(person))) {
      finalizePerson(person);
    } else {
      $.getData('/people/@'+person+'/@self', function(data, status) {
        $.gadgeteer[person] = data[0];
        finalizePerson(person);
      });
    }
  }
  setupPerson('viewer');
  setupPerson('owner');
});

if (typeof $g == "undefined") {
  $g = $.gadgeteer;
}

})(jQuery);
