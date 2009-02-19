var <%= @options.model %> = {
  host: backendHost,

  init: function() {
    // Do your own initialization here
  }
}

$.gadgeteer(<%= @options.model %>.init, {host: <%= @options.model %>.host});
