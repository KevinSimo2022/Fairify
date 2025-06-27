import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { MessageSquare, Send, Lightbulb, X, Plus } from 'lucide-react';

interface ContextMessage {
  id: string;
  text: string;
  timestamp: Date;
}

interface DatasetContextProps {
  onContextUpdate: (context: string[]) => void;
  placeholder?: string;
  maxMessages?: number;
}

const DatasetContext: React.FC<DatasetContextProps> = ({
  onContextUpdate,
  placeholder = "Describe your climate dataset: monitoring network, coverage areas, seasonal patterns, vulnerable regions...",
  maxMessages = 5
}) => {
  const [messages, setMessages] = useState<ContextMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const addMessage = () => {
    if (!currentInput.trim()) return;

    const newMessage: ContextMessage = {
      id: Date.now().toString(),
      text: currentInput.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...messages, newMessage];
    
    // Limit to maxMessages
    if (updatedMessages.length > maxMessages) {
      updatedMessages.shift();
    }

    setMessages(updatedMessages);
    setCurrentInput('');
    
    // Send context to parent component
    onContextUpdate(updatedMessages.map(m => m.text));
  };

  const removeMessage = (id: string) => {
    const updatedMessages = messages.filter(m => m.id !== id);
    setMessages(updatedMessages);
    onContextUpdate(updatedMessages.map(m => m.text));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addMessage();
    }
  };

  const suggestedPrompts = [
    "Precipitation data - only 8 stations in mountainous west despite 40% higher rainfall variability",
    "Temperature monitoring - 3 stations cover entire arid north where 200,000 pastoralists live",
    "Drought assessment - zero data points in northern pastoral districts with highest vulnerability",
    "Flood risk mapping - river basin areas have 70% fewer monitoring points than urban centers",
    "Agricultural climate data - key farming regions missing data during critical planting seasons",
    "Weather station network - highlands with unique microclimates have no active stations",
    "Climate vulnerability study - coastal communities facing sea-level rise completely unmonitored",
    "Seasonal rainfall analysis - monsoon-dependent regions lack data during peak precipitation"
  ];

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg font-roboto">Dataset Context</CardTitle>
            {messages.length > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {messages.length} context{messages.length > 1 ? 's' : ''} added
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription className="font-open-sans">
          {messages.length > 0 
            ? `Context will be used to enhance climate analysis. Click to ${isExpanded ? 'hide' : 'view/edit'} details.`
            : 'Help AI understand your climate data better by providing context about monitoring networks, coverage gaps, and vulnerable regions'
          }
        </CardDescription>
      </CardHeader>

      {/* Compact context preview when collapsed */}
      {!isExpanded && messages.length > 0 && (
        <CardContent className="pt-0">
          <div className="bg-blue-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Context Preview:</h4>
            <div className="space-y-1">
              {messages.slice(0, 2).map((message) => (
                <p key={message.id} className="text-sm text-blue-700 truncate">
                  • {message.text}
                </p>
              ))}
              {messages.length > 2 && (
                <p className="text-xs text-blue-600">
                  +{messages.length - 2} more context{messages.length > 3 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      )}

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Existing context messages */}
          {messages.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 font-roboto">Your Context:</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="flex items-start justify-between bg-blue-50 rounded-lg p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-open-sans text-gray-800">
                        {message.text}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMessage(message.id)}
                      className="ml-2 h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="space-y-3">
            <div className="flex space-x-2">
              <Textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                className="flex-1 min-h-[80px] resize-none font-open-sans"
                maxLength={500}
              />
              <Button
                onClick={addMessage}
                disabled={!currentInput.trim() || messages.length >= maxMessages}
                size="sm"
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Character count */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {currentInput.length}/500 characters
              </span>
              <span className="text-xs text-gray-500">
                {messages.length}/{maxMessages} context entries
              </span>
            </div>
          </div>

          {/* Suggested prompts */}
          {messages.length === 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <h4 className="text-sm font-medium text-gray-700 font-roboto">
                  Suggested Context:
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    onClick={() => setCurrentInput(prompt)}
                  >
                    {prompt}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Info note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Tips for better climate representation analysis:</p>
                <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                  <li>• Specify climate variables (temperature, rainfall, humidity, wind patterns)</li>
                  <li>• Identify critical climate zones: arid, coastal, mountainous, agricultural regions</li>
                  <li>• Mention seasonal factors: monsoons, dry seasons, extreme weather periods</li>
                  <li>• Note vulnerable communities: farmers, pastoralists, coastal populations</li>
                  <li>• Describe monitoring limitations: station accessibility, equipment failures, data gaps</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default DatasetContext;
