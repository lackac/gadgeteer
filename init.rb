require 'openssl'
require 'oauth'
require 'oauth/consumer'
require 'oauth/request_proxy/action_controller_request'
# require supported signature methods since they wouldn't be autoloaded
%w{
  hmac-md5 hmac-rmd160 hmac-sha1
  md5 plaintext rsa-sha1 sha1
}.each do |method|
  require "oauth/signature/#{method.tr('-', '/')}"
end

require 'gadgeteer'

ActionController::Base.send :include, Gadgeteer
