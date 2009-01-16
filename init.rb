require 'openssl'
require 'oauth'
require 'oauth/consumer'
require 'oauth/request_proxy/action_controller_request'

require 'gadgeteer'

ActionController::Base.send :include, Gadgeteer
