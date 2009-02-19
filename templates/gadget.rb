require 'ostruct'

<% if @options.sinatra %>
<%= @options.model %> = OpenStruct.new(YAML.load_file(File.join(Sinatra::Application.root, 'config', '<%= @options.singular %>.yml'))[Sinatra::Application.environment.to_s])
<% else %>
<%= @options.model %> = OpenStruct.new(YAML.load_file(File.join(RAILS_ROOT, 'config', '<%= @options.singular %>.yml'))[Rails.env])
<% end %>
