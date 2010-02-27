require 'openssl'
require 'oauth'
require 'oauth/consumer'
require 'oauth/request_proxy/action_controller_request'
require 'oauth/request_proxy/rack_request'
# require supported signature methods since they wouldn't be autoloaded
%w{
  hmac-md5 hmac-rmd160 hmac-sha1
  md5 plaintext rsa-sha1 sha1
}.each do |method|
  require "oauth/signature/#{method.tr('-', '/')}"
end

module Gadgeteer
  def self.included(base)
    root = defined?(Rails) ? Rails.root : Sinatra::Application.root
    if base.is_a?(Class)
      base.class_eval do
        @@public_keys = Hash[*Dir[File.join(root, 'config', 'certs', '*.cert')].map {|file| [File.basename(file)[0..-6], File.read(file)]}.flatten]
        @@oauth_secrets = YAML.load_file(File.join(root, 'config', 'oauth_secrets.yml')) rescue {}
        cattr_accessor :public_keys, :oauth_secrets
      end
    end
    if base.respond_to?(:helper_method)
      base.helper_method :open_social, :os_viewer, :os_owner
      base.helper Gadgeteer::ViewHelpers
    else
      base.send :include, Gadgeteer::ViewHelpers
    end
  end

  class SecretMissingError < StandardError; end
  class VerificationFailedError < StandardError; end

  module ViewHelpers
    def gadget_content_tag(view = nil, &block)
      content = "\n  <![CDATA[\n"
      unless view.nil?
        partial = if defined?(Rails)
          render :partial => "#{view}.html"
        else
          haml view
        end
        partial.strip!.gsub!("\n", "\n    ")
        content << "    #{partial}\n"
      end
      if block_given?
        content << "    "
        block_content = defined?(Rails) ? capture(&block) : capture_haml(&block)
        content << block_content.strip.gsub("\n", "\n    ")
        content << "\n"
      end
      content << "  ]]>\n"
      %{<Content type="html"#{%{ view="#{view}"} if view}>#{content}</Content>}
    end
  end

  protected
    def public_key(key)
      self.class.public_keys[key || :default]
    end

    def oauth_secret(key)
      self.class.oauth_secrets[key || :default]
    end

    def verify_signature!
      secret = if key = params[:xoauth_signature_publickey]
        public_key(key) ||
          raise(SecretMissingError, "Missing public key for #{key}")
      else
        key = params[:oauth_consumer_key]
        oauth_secret(key) ||
          raise(SecretMissingError, "Missing oauth secret for #{key}")
      end

      signature = OAuth::Signature.build(request) do
        # return the token secret and the consumer secret
        [nil, secret]
      end
      signature.verify || raise(VerificationFailedError, "Signature verification failed")
    end

    def verify_signature
      verify_signature!
    rescue OAuth::Signature::UnknownSignatureMethod, SecretMissingError, VerificationFailedError
      false
    end

    def open_social
      @_open_social ||= params.inject({}) do |h, (k,v)|
        k =~ /^(open_?social|os)_(.*)$/ ? h.merge($2 => v) : h
      end.with_indifferent_access
    end

    def os_viewer
      @_os_viewer ||= open_social.inject({}) do |h, (k,v)|
        k =~ /^viewer_(.*)$/ ? h.merge($1 => v) : h
      end.with_indifferent_access
    end

    def os_owner
      @_os_owner ||= open_social.inject({}) do |h, (k,v)|
        k =~ /^owner_(.*)$/ ? h.merge($1 => v) : h
      end.with_indifferent_access
    end
end
