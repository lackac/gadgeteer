module Gadgeteer
  def self.included(base)
    if base.is_a?(Class)
      base.class_eval do
        @@public_keys = Dir[File.join(Rails.root, 'config', 'certs', '*.cert')].inject({}) do |keys, file|
          cert = OpenSSL::X509::Certificate.new(File.read(file))
          pkey = OpenSSL::PKey::RSA.new(cert.public_key)
          keys.merge(File.basename(file)[0..-6] => pkey)
        end
        @@oauth_secrets = YAML.load_file(File.join(Rails.root, 'config', 'oauth_secrets.yml')) rescue {}
        cattr_accessor :public_keys, :oauth_secrets
      end
    end
  end

  protected
    def public_key(key)
      @@public_keys[key || :default]
    end

    def oauth_secret(key)
      @@oauth_secrets[key || :default]
    end

    def verify_signature
      secret = if params[:xoauth_signature_publickey]
        public_key(params[:xoauth_signature_publickey])
      else
        oauth_secret(params[:oauth_consumer_key])
      end
      consumer = OAuth::Consumer.new(params[:oauth_consumer_key], secret)

      begin
        signature = OAuth::Signature.build(request) do
          # return the token secret and the consumer secret
          [nil, consumer.secret]
        end
        pass = signature.verify
      rescue OAuth::Signature::UnknownSignatureMethod => e
        logger.error "ERROR #{e}"
      end
    end

    def open_social
      @_open_social ||= params.inject({}) do |h, (k,v)|
        if k =~ /^(open_?social|os)_(.*)$/
          h.merge($2 => v)
        else
          h
        end
      end.with_indifferent_access
    end
end
