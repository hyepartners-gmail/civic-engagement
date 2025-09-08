"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Topic } from '@/types';
import PlatformCard from '@/components/PlatformCard';
import TopicFormModal from './TopicFormModal'; // Import the new modal
import { PlusCircle, Edit, Trash2, Database, GripVertical } from 'lucide-react'; // Import Database icon and GripVertical for drag handle
import { colors } from '../../lib/theme'; // Import centralized colors
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'; // Import drag and drop components

const TopicManager: React.FC = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null); // State for topic being edited
  const [isSaving, setIsSaving] = useState(false); // State for saving order
  const { toast } = useToast();

  const fetchTopics = async () => {
    setLoading(true);
    try {
      // Fetch all topics, including pending ones, for admin view
      const response = await fetch('/api/topics?region=all'); 
      if (!response.ok) throw new Error('Failed to fetch topics.');
      const data: Topic[] = await response.json();
      
      // Sort topics by order field if available, otherwise keep original order
      const sortedTopics = [...data].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        // If order is not defined for either topic, keep original order
        return 0;
      });
      
      setTopics(sortedTopics);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleCreateTopic = () => {
    setEditingTopic(null); // Clear any editing state
    setIsModalOpen(true);
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!window.confirm('Are you sure you want to delete this topic? This action cannot be undone.')) {
      return;
    }

    // isAdmin is now derived from session on the API side

    try {
      const response = await fetch('/api/admin/topics/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: topicId }), // Removed isAdmin
      });
      if (!response.ok) throw new Error('Failed to delete topic.');
      toast({ title: 'Success', description: 'Topic deleted successfully.' });
      fetchTopics(); // Refresh the list
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleSeedTopics = async () => {
    if (!window.confirm('This will add/update dummy topics in your database. Continue?')) {
      return;
    }
    try {
      const response = await fetch('/api/admin/seed-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No body needed for this specific seed endpoint
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to seed topics.');
      }
      toast({ title: 'Success', description: 'Dummy topics seeded successfully!' });
      fetchTopics(); // Refresh the list to show new/updated topics
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error Seeding', description: error.message });
    }
  };

  // Handle drag end event
  const onDragEnd = async (result: DropResult) => {
    // Dropped outside the list
    if (!result.destination) {
      return;
    }

    // No change in position
    if (result.destination.index === result.source.index) {
      return;
    }

    // Reorder topics array
    const newTopics = Array.from(topics);
    const [removed] = newTopics.splice(result.source.index, 1);
    newTopics.splice(result.destination.index, 0, removed);

    // Update order field for all topics
    const updatedTopics = newTopics.map((topic, index) => ({
      ...topic,
      order: index
    }));

    setTopics(updatedTopics);
    
    // Save the new order to the database
    try {
      setIsSaving(true);
      const response = await fetch('/api/admin/topics/update-order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicOrders: updatedTopics.map(topic => ({
            id: topic.id,
            order: topic.order
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update topic order.');
      }

      const data = await response.json();
      toast({ title: 'Success', description: `Topic order updated successfully. Updated ${data.updated} topics.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      // Revert to previous state on error
      fetchTopics();
    } finally {
      setIsSaving(false);
    }
  };

  // Initialize topic orders
  const initializeTopicOrder = async () => {
    if (!window.confirm('This will set the initial order for all topics based on their current display order. Continue?')) {
      return;
    }

    try {
      setIsSaving(true);
      const updatedTopics = topics.map((topic, index) => ({
        ...topic,
        order: index
      }));

      const response = await fetch('/api/admin/topics/update-order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicOrders: updatedTopics.map(topic => ({
            id: topic.id,
            order: topic.order
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize topic order.');
      }

      const data = await response.json();
      setTopics(updatedTopics);
      toast({ title: 'Success', description: `Topic order initialized successfully. Updated ${data.updated} topics.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <p className="font-normal">Loading topics...</p>;

  return (
    <div className="font-sans">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-2"> {/* Increased mb */}
        <h3 className="text-lg sm:text-xl font-thin">Manage Topics</h3>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={initializeTopicOrder} 
            variant="platform-secondary" 
            className="text-sm sm:text-base px-4 py-2"
            disabled={isSaving}
          >
            <Database className="h-4 w-4 mr-2" /> Initialize Topic Order
          </Button>
          <Button onClick={handleSeedTopics} variant="platform-secondary" className="text-sm sm:text-base px-4 py-2"> {/* Standardized padding */}
            <Database className="h-4 w-4 mr-2" /> Seed Topics
          </Button>
          <Button onClick={handleCreateTopic} variant="platform-primary" className="text-sm sm:text-base px-4 py-2"> {/* Standardized padding */}
            <PlusCircle className="h-4 w-4 mr-2" /> Create New Topic
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-platform-text/70 font-normal">
          Drag and drop topics to reorder them. This order will be used when topics initially load for users.
          After a user votes, topics will rearrange themselves based on votes.
        </p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="topics">
          {(provided) => (
            <div 
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4" // Increased space-y
            >
              {topics.length > 0 ? (
                topics.map((topic, index) => (
                  <Draggable key={topic.id} draggableId={topic.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="mb-2"
                      >
                        <PlatformCard 
                          variant="background" 
                          className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                        >
                          <div className="flex items-center w-full">
                            <div 
                              {...provided.dragHandleProps}
                              className="mr-3 cursor-move text-platform-text/50 hover:text-platform-text"
                            >
                              <GripVertical className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="text-xs font-semibold text-platform-text/40 mr-2">#{index + 1}</span>
                                <p className="text-sm font-medium text-platform-text">{topic.title}</p>
                              </div>
                              <p className="text-xs text-platform-text/70 font-normal">{topic.preview}</p>
                              <p className="text-xs text-platform-text/50 font-normal">Region: {topic.region} | Status: {topic.status || 'approved'}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                              <Button size="sm" variant="platform-secondary" className="font-semibold text-xs sm:text-sm px-4 py-2" onClick={() => {setEditingTopic(topic); setIsModalOpen(true);}}> {/* Standardized padding */}
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Edit
                              </Button>
                              <Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm px-4 py-2" onClick={() => handleDeleteTopic(topic.id)}> {/* Standardized padding */}
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Delete
                              </Button>
                            </div>
                          </div>
                        </PlatformCard>
                      </div>
                    )}
                  </Draggable>
                ))
              ) : (
                <p className="font-normal text-platform-text/70">No topics to display. Create one!</p>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <TopicFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchTopics} // Refresh list after save
        editingTopic={editingTopic}
      />
    </div>
  );
};

export default TopicManager;